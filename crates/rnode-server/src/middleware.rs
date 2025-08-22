use crate::types::{get_event_queue, get_middleware};
use neon::prelude::*;
use serde_json;

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
        middleware_vec.push(crate::types::MiddlewareInfo {
            path: path.clone(),
            handler_id: handler_id.clone(),
        });
    }

    println!(
        "Middleware registered successfully: {} -> {}",
        path, handler_id
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

    let middleware = get_middleware();
    let middleware_vec = middleware.read().unwrap();

    // Get path from request_data
    let actual_path = request_data
        .get("path")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    for middleware_info in middleware_vec.iter() {
        // Check if middleware matches the current path
        if actual_path.starts_with(&middleware_info.path) || middleware_info.path == "*" {
            // Create middleware data, adding isMiddleware flag
            let mut middleware_data = request_data.clone();
            middleware_data.insert("isMiddleware".to_string(), serde_json::Value::Bool(true));

            // Add empty customParams for middleware
            middleware_data.insert(
                "customParams".to_string(),
                serde_json::Value::Object(serde_json::Map::new()),
            );

            let middleware_json = serde_json::to_string(&middleware_data).unwrap();

            // Execute middleware through JavaScript
            let event_queue = get_event_queue();
            let channel = {
                let event_queue_map = event_queue.read().unwrap();
                event_queue_map.clone()
            };

            if let Some(channel) = channel {
                let (tx, rx) = std::sync::mpsc::channel();
                let middleware_json_clone = middleware_json.clone();

                let _join_handle = channel.send(move |mut cx| {
                    let global: Handle<JsObject> = cx.global("global")?;
                    let execute_middleware_fn: Handle<JsFunction> =
                        global.get(&mut cx, "executeMiddleware")?;

                    let result: Handle<JsString> = execute_middleware_fn
                        .call_with(&mut cx)
                        .arg(cx.string(&middleware_json_clone))
                        .apply(&mut cx)?;

                    let _ = tx.send(result.value(&mut cx));
                    Ok(())
                });

                // Wait for middleware result
                let result = match rx.recv_timeout(std::time::Duration::from_millis(1000)) {
                    Ok(result) => result,
                    Err(_) => {
                        return Err(Response::builder()
                            .status(StatusCode::INTERNAL_SERVER_ERROR)
                            .body(Body::from("Middleware timeout"))
                            .unwrap());
                    }
                };

                // Parse middleware result
                let middleware_result: serde_json::Value = serde_json::from_str(&result)
                    .unwrap_or_else(|_| serde_json::json!({"shouldContinue": true}));

                // If middleware wants to interrupt execution
                if let Some(should_continue) = middleware_result["shouldContinue"].as_bool() {
                    if !should_continue {
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

                // Modify request_data customParams from middleware
                if let Some(custom_params) = middleware_result["customParams"].as_object() {
                    for (key, value) in custom_params {
                        request_data.insert(key.clone(), value.clone());
                    }
                }
            }
        }
    }

    Ok(())
}
