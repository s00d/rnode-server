use crate::types::{get_event_queue, get_middleware};
use neon::prelude::*;
use serde_json;
use globset::{Glob, GlobSetBuilder};

// Function for middleware registration
pub fn register_middleware(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let path = cx.argument::<JsString>(0)?.value(&mut cx);
    let _handler = cx.argument::<JsFunction>(1)?; // JS middleware function

    println!("Registering middleware for path: {}", path);

    // Generate unique middleware ID
    let handler_id = format!(
        "middleware_{}_{}",
        path.replace('/', "_"),
        std::process::id()
    );

    // Add middleware to global storage
    let middleware = get_middleware();
    {
        let mut middleware_vec = middleware.write().unwrap();
        
        // Check if middleware for this path already exists
        if let Some(existing_middleware) = middleware_vec.iter_mut().find(|m| m.path == path) {
            // Update existing middleware
            existing_middleware.middleware_id = handler_id.clone();
            println!("🔄 Updated existing middleware for path: {} -> {}", path, handler_id);
        } else {
            // Add new middleware
            let middleware_info = crate::types::MiddlewareInfo {
                path: path.to_string(),
                middleware_id: handler_id.clone(),
            };
            middleware_vec.push(middleware_info);
            println!("✅ Added new middleware for path: {} -> {}", path, handler_id);
        }
    }

    println!(
        "Middleware registration completed for path: {}",
        path
    );

    Ok(cx.undefined())
}

// Function for middleware execution
pub async fn execute_middleware(
    request_data: &mut serde_json::Map<String, serde_json::Value>,
) -> Result<(), axum::response::Response<axum::body::Body>> {
    use axum::body::Body;
    use axum::http::StatusCode;
    use axum::response::Response;

    // Get path from request_data
    let actual_path = request_data
        .get("path")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    println!("🔍 Executing middleware for path: '{}'", actual_path);
    println!("🔍 Available middleware: {:?}", request_data.get("customParams"));
    println!("🔧 Initial request_data customParams: {:?}", request_data.get("customParams"));

    // Initialize customParams if they don't exist
    if !request_data.contains_key("customParams") {
        request_data.insert("customParams".to_string(), serde_json::Value::Object(serde_json::Map::new()));
        println!("🔧 Initialized customParams object");
    }

    // Get middleware for this path
    let middleware = get_middleware();
    let middleware_vec = middleware.read().unwrap();
    
    // Check each middleware pattern for matches
    for middleware_info in middleware_vec.iter() {
        // Use globset for flexible wildcard matching
        let matches = if let Ok(glob) = Glob::new(&middleware_info.path) {
            // Create a GlobSet with single pattern for matching
            let mut builder = GlobSetBuilder::new();
            builder.add(glob);
            if let Ok(globset) = builder.build() {
                let result = globset.is_match(&actual_path);
                println!("🔍 Globset check: '{}' matches '{}' -> {}", actual_path, middleware_info.path, result);
                result
            } else {
                // Fallback if GlobSet building fails
                let result = actual_path == middleware_info.path;
                println!("🔍 Fallback exact match: '{}' == '{}' -> {}", actual_path, middleware_info.path, result);
                result
            }
        } else {
            // Fallback to simple string comparison if glob parsing fails
            let result = actual_path == middleware_info.path;
            println!("🔍 Simple fallback: '{}' == '{}' -> {}", actual_path, middleware_info.path, result);
            result
        };
        
        println!("🔍 Checking middleware: {} -> matches: {} (glob: {})", 
                 middleware_info.path, matches, middleware_info.path);
        
        if matches {
            println!("✅ Middleware matched: {} -> {}", middleware_info.path, middleware_info.middleware_id);
            
            // Execute middleware for this pattern
            println!("🔍 Executing middleware for path: {}", actual_path);
        
            // Call JavaScript executeMiddleware function through event queue
            let middleware_result = {
                let event_queue = get_event_queue();
                let channel = {
                    let event_queue_map = event_queue.read().unwrap();
                    event_queue_map.clone()
                };
                
                if let Some(channel) = channel {
                    let (tx, rx) = std::sync::mpsc::channel();
                    let request_json = serde_json::to_string(&request_data).unwrap();
                    let request_json_clone = request_json.clone();
                    
                    let _join_handle = channel.send(move |mut cx| {
                        let global: Handle<JsObject> = cx.global("global")?;
                        let execute_middleware_fn: Handle<JsFunction> = global.get(&mut cx, "executeMiddleware")?;
                        
                        let result: Handle<JsString> = execute_middleware_fn
                            .call_with(&mut cx)
                            .arg(cx.string(&request_json_clone))
                            .apply(&mut cx)?;
                        
                        let _ = tx.send(result.value(&mut cx));
                        Ok(())
                    });
                    
                    // Wait for middleware result
                    let result = match rx.recv_timeout(std::time::Duration::from_millis(1000)) {
                        Ok(result) => result,
                        Err(_) => {
                            println!("❌ Middleware timeout for: {}", actual_path);
                            return Err(Response::builder()
                                .status(StatusCode::INTERNAL_SERVER_ERROR)
                                .body(Body::from("Middleware timeout"))
                                .unwrap());
                        }
                    };
                    
                    println!("🔍 Middleware result: {}", result);
                    
                    // Parse middleware result
                    serde_json::from_str::<serde_json::Value>(&result)
                        .unwrap_or_else(|_| serde_json::json!({"shouldContinue": true}))
                } else {
                    println!("❌ No event queue available");
                    serde_json::json!({"shouldContinue": true})
                }
            };

            // If middleware wants to interrupt execution
            if let Some(should_continue) = middleware_result["shouldContinue"].as_bool() {
                if !should_continue {
                    println!("🛑 Middleware interrupted execution: {}", actual_path);
                    // Middleware interrupts execution
                    let content = middleware_result["content"]
                        .as_str()
                        .unwrap_or("")
                        .to_string();
                    let content_type = middleware_result["contentType"]
                        .as_str()
                        .unwrap_or("text/plain")
                        .to_string();

                    let mut response_builder = Response::builder()
                        .status(StatusCode::OK)
                        .header("content-type", content_type);

                    // Add headers from middleware
                    if let Some(headers) = middleware_result["headers"].as_object() {
                        for (key, value) in headers {
                            if let Some(value_str) = value.as_str() {
                                response_builder = response_builder.header(key, value_str);
                            }
                        }
                    }

                    let response = response_builder.body(Body::from(content)).unwrap();
                    return Err(response);
                }
            }

            // Always update request_data from middleware, regardless of shouldContinue
            // This ensures parameters are preserved even when middleware continues
            
            // Update customParams if middleware returned them
            if let Some(custom_params) = middleware_result["customParams"].as_object() {
                for (key, value) in custom_params {
                    request_data.insert(key.clone(), value.clone());
                }
                println!("🔧 Updated request_data customParams: {:?}", custom_params);
            }
            
            // Update other fields that middleware might have changed
            if let Some(headers) = middleware_result["headers"].as_object() {
                for (key, value) in headers {
                    if let Some(_value_str) = value.as_str() {
                        // Update headers in request_data if they exist
                        if let Some(existing_headers) = request_data.get("headers").and_then(|h| h.as_object()) {
                            let mut new_headers = existing_headers.clone();
                            new_headers.insert(key.clone(), value.clone());
                            request_data.insert("headers".to_string(), serde_json::Value::Object(new_headers));
                        }
                    }
                }
                println!("🔧 Updated request_data headers from middleware");
            }
            
            // Update any other fields that middleware might have modified
            for (key, value) in middleware_result.as_object().unwrap_or(&serde_json::Map::new()) {
                // Skip internal fields that shouldn't overwrite request_data
                if !["shouldContinue", "req", "res"].contains(&key.as_str()) {
                    request_data.insert(key.clone(), value.clone());
                    println!("🔧 Updated request_data field '{}': {:?}", key, value);
                }
            }
            
            // If middleware returns complete req and res objects, use them to update request_data
            if let Some(complete_req) = middleware_result["req"].as_object() {
                println!("🔧 Middleware returned complete req object, updating request_data");
                for (key, value) in complete_req {
                    // Skip internal fields that shouldn't overwrite request_data
                    if !["isMiddleware"].contains(&key.as_str()) {
                        request_data.insert(key.clone(), value.clone());
                        println!("🔧 Updated request_data from complete req: {} = {:?}", key, value);
                    }
                }
            }
            
            if let Some(complete_res) = middleware_result["res"].as_object() {
                println!("🔧 Middleware returned complete res object, updating request_data");
                // Handle response data if needed
                if let Some(content) = complete_res.get("content") {
                    println!("🔧 Response content: {:?}", content);
                }
                if let Some(content_type) = complete_res.get("contentType") {
                    println!("🔧 Response content type: {:?}", content_type);
                }
                if let Some(headers) = complete_res.get("headers") {
                    println!("🔧 Response headers: {:?}", headers);
                }
            }
            
            println!("🔧 request_data after middleware update: {:?}", request_data);
            println!("✅ Middleware execution completed successfully");
            break; // Exit loop after finding a match
        }
    }

    println!("🔧 Final request_data customParams: {:?}", request_data.get("customParams"));
    println!("✅ Middleware execution completed for path: {}", actual_path);
    
    // Ensure customParams are properly set in request_data for the main handler
    if let Some(custom_params) = request_data.get("customParams") {
        if custom_params.is_null() {
            // If customParams is null, create an empty object
            request_data.insert("customParams".to_string(), serde_json::Value::Object(serde_json::Map::new()));
            println!("🔧 Created empty customParams object for main handler");
        }
    } else {
        // If customParams doesn't exist, create an empty object
        request_data.insert("customParams".to_string(), serde_json::Value::Object(serde_json::Map::new()));
        println!("🔧 Created missing customParams object for main handler");
    }
    
    Ok(())
}
