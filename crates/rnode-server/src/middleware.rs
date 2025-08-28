// Убираем старую систему промисов - теперь используем встроенные промисы Neon
use crate::request::Request;
use crate::types::{get_event_queue, get_middleware};
use globset::{Glob, GlobSetBuilder};
use log::{debug, error, info, warn};
use neon::prelude::*;
use serde_json;

// Function for middleware registration
pub fn register_middleware(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let path = cx.argument::<JsString>(0)?.value(&mut cx);
    let _handler = cx.argument::<JsFunction>(1)?; // JS middleware function

    info!("Registering middleware for path: {}", path);

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
            info!(
                "🔄 Updated existing middleware for path: {} -> {}",
                path, handler_id
            );
        } else {
            // Add new middleware
            let middleware_info = crate::types::MiddlewareInfo {
                path: path.to_string(),
                middleware_id: handler_id.clone(),
            };
            middleware_vec.push(middleware_info);
            info!(
                "✅ Added new middleware for path: {} -> {}",
                path, handler_id
            );
        }
    }

    info!("Middleware registration completed for path: {}", path);

    Ok(cx.undefined())
}

// Function for middleware execution with Request and Response objects
pub async fn execute_middleware(
    request: &mut Request,
    timeout: u64,   // Timeout from app options
    dev_mode: bool, // Dev mode from app options
) -> Result<(), axum::response::Response<axum::body::Body>> {
    use axum::body::Body;
    use axum::http::StatusCode;
    use axum::response::Response;

    // Get path from request
    let actual_path = request.path.clone();

    debug!("🔍 Executing middleware for path: '{}'", actual_path);
    debug!("🔍 Available middleware: {:?}", request.custom_params);
    debug!(
        "🔧 Initial request customParams: {:?}",
        request.custom_params
    );

    // Initialize customParams if they don't exist
    if request.custom_params.is_empty() {
        request.custom_params = serde_json::Map::new();
        debug!("🔧 Initialized customParams object");
    }

    // Get middleware for this path
    let middleware = get_middleware();

    // Check each middleware pattern for matches
    let middleware_info_opt = {
        let middleware_vec = middleware.read().unwrap();
        middleware_vec
            .iter()
            .find(|middleware_info| {
                // Use globset for flexible wildcard matching
                let matches = if let Ok(glob) = Glob::new(&middleware_info.path) {
                    // Create a GlobSet with single pattern for matching
                    let mut builder = GlobSetBuilder::new();
                    builder.add(glob);
                    if let Ok(globset) = builder.build() {
                        let result = globset.is_match(&actual_path);
                        debug!(
                            "🔍 Globset check: '{}' matches '{}' -> {}",
                            actual_path, middleware_info.path, result
                        );
                        result
                    } else {
                        // Fallback if GlobSet building fails
                        let result = actual_path == middleware_info.path;
                        debug!(
                            "🔍 Fallback exact match: '{}' == '{}' -> {}",
                            actual_path, middleware_info.path, result
                        );
                        result
                    }
                } else {
                    // Fallback to simple string comparison if glob parsing fails
                    let result = actual_path == middleware_info.path;
                    debug!(
                        "🔍 Simple fallback: '{}' == '{}' -> {}",
                        actual_path, middleware_info.path, result
                    );
                    result
                };

                debug!(
                    "🔍 Checking middleware: {} -> matches: {} (glob: {})",
                    middleware_info.path, matches, middleware_info.path
                );

                matches
            })
            .cloned()
    };

    if let Some(middleware_info) = middleware_info_opt {
        info!(
            "✅ Middleware matched: {} -> {}",
            middleware_info.path, middleware_info.middleware_id
        );

        // Execute middleware for this pattern
        debug!("🔍 Executing middleware for path: {}", actual_path);

        // Call JavaScript executeMiddleware function through event queue
        let event_queue = get_event_queue();
        let middleware_result = {
            let channel = {
                let event_queue_map = event_queue.read().unwrap();
                event_queue_map.clone()
            };

            if let Some(channel) = channel {
                let (tx, rx) = std::sync::mpsc::channel();
                let request_json = serde_json::to_string(&request.to_json_map()).unwrap();
                let request_json_clone = request_json.clone();

                let _join_handle = channel.send(move |mut cx| {
                    let global: Handle<JsObject> = cx.global("global")?;
                    let execute_middleware_fn: Handle<JsFunction> =
                        global.get(&mut cx, "executeMiddleware")?;

                    // Call executeMiddleware function - it returns a Promise
                    let result: Handle<JsValue> = execute_middleware_fn
                        .call_with(&mut cx)
                        .arg(cx.string(&request_json_clone))
                        .arg(cx.number(timeout as f64))
                        .apply(&mut cx)?;

                    // Check if result is a Promise
                    if result.is_a::<JsPromise, _>(&mut cx) {
                        let promise: Handle<JsPromise> = result.downcast_or_throw(&mut cx)?;

                        // Convert JavaScript Promise to Rust Future
                        let promise_future = promise.to_future(&mut cx, |mut cx, result| {
                            // Get the promise's result value (or throw if it was rejected)
                            let value = result.or_throw(&mut cx)?;

                            // Convert the result to string
                            let result_string = value
                                .to_string(&mut cx)
                                .unwrap_or_else(|_| cx.string("Failed to convert promise result"));

                            Ok(result_string.value(&mut cx))
                        })?;

                        // Spawn a task to await the future
                        let _channel = cx.channel();
                        let tx_clone = tx.clone();

                        // Spawn async task in separate thread
                        std::thread::spawn(move || {
                            let rt = tokio::runtime::Builder::new_current_thread()
                                .enable_all()
                                .build()
                                .unwrap();

                            rt.block_on(async {
                                let result = promise_future.await;

                                match result {
                                    Ok(result_string) => {
                                        let _ = tx_clone.send(result_string);
                                    }
                                    Err(err) => {
                                        let error_msg = format!("Promise failed: {:?}", err);
                                        let _ = tx_clone.send(error_msg);
                                    }
                                }
                            });
                        });
                    } else {
                        // Not a promise, convert directly
                        let result_string = result
                            .to_string(&mut cx)
                            .unwrap_or_else(|_| cx.string("Failed to handle middleware result"));
                        let _ = tx.send(result_string.value(&mut cx));
                    }

                    Ok(())
                });

                // Wait for middleware result
                let result = match rx.recv() {
                    Ok(result) => result,
                    Err(_) => {
                        warn!(
                            "❌ Failed to receive middleware result for: {}",
                            actual_path
                        );
                        return Err(Response::builder()
                            .status(StatusCode::INTERNAL_SERVER_ERROR)
                            .body(Body::from("Middleware failed"))
                            .unwrap());
                    }
                };

                debug!("🔍 Middleware result: {}", result);
                debug!(
                    "🔍 Middleware result type: {}",
                    std::any::type_name::<std::string::String>()
                );
                debug!("🔍 Middleware result length: {}", result.len());
                debug!(
                    "🔍 Middleware result first 200 chars: {}",
                    result.chars().take(200).collect::<String>()
                );

                // Parse middleware result
                let middleware_result: serde_json::Value = serde_json::from_str(&result)
                    .unwrap_or_else(|_| serde_json::json!({"shouldContinue": true}));

                middleware_result
            } else {
                error!("❌ No event queue available");
                serde_json::json!({"shouldContinue": true})
            }
        };

        // If middleware wants to interrupt execution
        if let Some(should_continue) = middleware_result["shouldContinue"].as_bool() {
            if !should_continue {
                warn!("🛑 Middleware interrupted execution: {}", actual_path);

                // Check if middleware returned an error
                if let Some(error) = middleware_result.get("error") {
                    error!("❌ Middleware error: {:?}", error);

                    // Return error response
                    let error_message = error.as_str().unwrap_or("Middleware error");
                    return Err(crate::html_templates::generate_error_page(
                        StatusCode::FORBIDDEN,
                        "Access Denied",
                        "Middleware has blocked this request",
                        Some(&format!("Error: {}", error_message)),
                        dev_mode,
                    ));
                }

                // Middleware interrupts execution without error
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
                        let key_lower = key.to_lowercase();
                        // Skip system headers that Axum sets automatically
                        if ![
                            "content-type",
                            "content-length",
                            "transfer-encoding",
                            "connection",
                            "keep-alive",
                        ]
                        .contains(&key_lower.as_str())
                        {
                            if let Some(value_str) = value.as_str() {
                                response_builder = response_builder.header(key, value_str);
                            }
                        }
                    }
                }

                // Add cookies from middleware
                if let Some(cookies) = middleware_result["cookies"].as_array() {
                    for cookie in cookies {
                        if let Some(cookie_str) = cookie.as_str() {
                            response_builder = response_builder.header("set-cookie", cookie_str);
                        }
                    }
                }

                let response = response_builder.body(Body::from(content)).unwrap();
                return Err(response);
            }
        }

        // If middleware returns complete req and res objects, use them to update request
        if let Some(complete_req) = middleware_result["req"].as_object() {
            debug!("🔧 Middleware returned complete req object, updating request");
            for (key, value) in complete_req {
                // Skip internal fields that shouldn't overwrite request
                if !["isMiddleware"].contains(&key.as_str()) {
                    // Universal field update - automatically handle all fields
                    Request::update_request_field(request, key, value);
                    debug!("🔧 Updated request field '{}': {:?}", key, value);
                }
            }
        }

        if let Some(complete_res) = middleware_result["res"].as_object() {
            debug!("🔧 Middleware returned complete res object, updating response");
            // Handle response data if needed
            if let Some(content) = complete_res.get("content") {
                request.content = content.clone();
                debug!("🔧 Response content: {:?}", content);
            }
            if let Some(content_type) = complete_res.get("contentType") {
                request.content_type = content_type.as_str().unwrap_or("text/plain").to_string();
                debug!("🔧 Response content type: {:?}", content_type);
            }
            if let Some(headers) = complete_res.get("headers") {
                debug!("🔧 Response headers: {:?}", headers);
                // Update response headers
                if let Some(headers_obj) = headers.as_object() {
                    for (key, value) in headers_obj {
                        request.headers.insert(key.clone(), value.clone());
                    }
                }
                debug!("🔧 Updated response headers");
            }
            if let Some(cookies) = complete_res.get("cookies") {
                debug!("🔧 Response cookies: {:?}", cookies);
                // Update response cookies
                if let Some(cookies_array) = cookies.as_array() {
                    for cookie in cookies_array {
                        if let Some(cookie_str) = cookie.as_str() {
                            // Parse cookie string like "name=value" and add to cookies map
                            if let Some((name, value)) = cookie_str.split_once('=') {
                                request.cookies.insert(
                                    name.to_string(),
                                    serde_json::Value::String(value.to_string()),
                                );
                            }
                        }
                    }
                }
                debug!("🔧 Updated response cookies");
            }
        }

        debug!(
            "🔧 request after middleware update: {:?}",
            request.custom_params
        );
        info!("✅ Middleware execution completed successfully");
    }

    debug!("🔧 Final request customParams: {:?}", request.custom_params);
    info!(
        "✅ Middleware execution completed for path: {}",
        actual_path
    );

    // Ensure customParams are properly set in request for the main handler
    if request.custom_params.is_empty() {
        request.custom_params = serde_json::Map::new();
        debug!("🔧 Created empty customParams object for main handler");
    }

    Ok(())
}
