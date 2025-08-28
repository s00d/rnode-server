use crate::request::Request;

use crate::middleware::execute_middleware;
use log::{debug, info};
use neon::prelude::*;
use serde_json;

// Function for processing HTTP requests - called from JavaScript
pub fn process_http_request(mut cx: FunctionContext) -> JsResult<JsString> {
    let method = cx.argument::<JsString>(0)?.value(&mut cx);
    let path = cx.argument::<JsString>(1)?.value(&mut cx);

    // Call JavaScript function getHandler(method, path)
    // For now return a stub
    let result = format!("Processing {} {} in JavaScript", method, path);

    Ok(cx.string(result))
}

// Dynamic handler for registered routes
pub async fn dynamic_handler(
    req: axum::extract::Request,
    actual_path: String, // Actual requested path
    registered_path: String,
    method: String,
    _handler_id: String,
    timeout: u64,   // Timeout from app options
    dev_mode: bool, // Dev mode from app options
) -> axum::response::Response<axum::body::Body> {
    info!("🚀 Dynamic handler called - START");
    debug!("🔍 Dynamic handler called:");
    debug!("  Method: {}", method);
    debug!("  Actual path: {}", actual_path);
    debug!("  Registered path: {}", registered_path);
    debug!("  Handler ID: {}", _handler_id);
    use axum::body::Body;
    use axum::http::StatusCode;

    // Получаем готовые Request и Response объекты из extensions
    let request = req.extensions().get::<Request>().cloned();

    if let Some(mut request) = request {
        // Обновляем path и registered_path
        request.path = actual_path.clone();
        request.registered_path = registered_path.clone();
        request.method = method.clone();

        // Извлекаем path параметры
        let actual_segments: Vec<&str> = actual_path.split('/').collect();
        let registered_segments: Vec<&str> = registered_path.split('/').collect();

        // Process simple parameters like :id
        if actual_segments.len() == registered_segments.len() {
            for (i, registered_seg) in registered_segments.iter().enumerate() {
                if registered_seg.starts_with(':') && i < actual_segments.len() {
                    let param_name = &registered_seg[1..]; // Remove :
                    let param_value = actual_segments[i];
                    request.path_params.insert(
                        param_name.to_string(),
                        serde_json::Value::String(param_value.to_string()),
                    );
                }
            }
        }

        // Process named parameters like {postId} or {commentId}
        if actual_segments.len() == registered_segments.len() {
            for (i, registered_seg) in registered_segments.iter().enumerate() {
                if registered_seg.starts_with('{')
                    && registered_seg.ends_with('}')
                    && !registered_seg.contains("{*")
                {
                    // Extract parameter name from {param} (excluding wildcard {*param})
                    let param_name = registered_seg.trim_start_matches('{').trim_end_matches('}');

                    if i < actual_segments.len() {
                        let param_value = actual_segments[i];
                        debug!("📝 Named parameter {{{}}}: '{}'", param_name, param_value);
                        request.path_params.insert(
                            param_name.to_string(),
                            serde_json::Value::String(param_value.to_string()),
                        );
                    }
                }
            }
        }

        // Process wildcard parameters like {*filepath}
        if registered_path.contains("{*") {
            let wildcard_start = registered_path.find("{*").unwrap();
            let wildcard_end = registered_path.find('}').unwrap();
            let wildcard_name = &registered_path[wildcard_start + 2..wildcard_end]; // Remove {* and }

            let wildcard_value = if actual_path.len() > wildcard_start {
                &actual_path[wildcard_start..]
            } else {
                ""
            };

            if !wildcard_value.is_empty() {
                debug!(
                    "📝 Wildcard parameter {{*{}}}: '{}'",
                    wildcard_name, wildcard_value
                );
                request.path_params.insert(
                    wildcard_name.to_string(),
                    serde_json::Value::String(wildcard_value.to_string()),
                );
            }
        }

        // Add query parameters to request
        if let Some(query) = req.uri().query() {
            for pair in query.split('&') {
                if let Some((key, value)) = pair.split_once('=') {
                    let decoded_key = urlencoding::decode(key)
                        .unwrap_or_else(|_| std::borrow::Cow::Borrowed(key))
                        .into_owned();
                    let decoded_value = urlencoding::decode(value)
                        .unwrap_or_else(|_| std::borrow::Cow::Borrowed(value))
                        .into_owned();
                    request
                        .query_params
                        .insert(decoded_key, serde_json::Value::String(decoded_value));
                }
            }
        }

        // Example of using new Request methods
        debug!("🔍 Request details:");
        debug!("  Method: {}", request.method);
        debug!("  Path: {}", request.path);
        debug!("  IP: {} (source: {})", request.ip, request.ip_source);
        debug!("  Content-Type: {}", request.content_type);
        debug!("  Body size: {}", request.get_body_size());
        debug!("  Is JSON: {}", request.is_json());
        debug!("  Is Form: {}", request.is_form());
        debug!("  Is AJAX: {}", request.is_ajax());
        debug!("  Is API: {}", request.is_api());
        debug!("  Is Mobile: {}", request.is_mobile());
        debug!("  User-Agent: {:?}", request.get_user_agent());
        debug!("  Language: {:?}", request.get_language());

        match execute_middleware(&mut request, timeout, dev_mode).await {
            Ok(()) => {
                debug!("✅ Middleware executed successfully, continuing to handler");
            } // Middleware successfully executed, request_data modified
            Err(middleware_response) => {
                debug!("❌ Middleware failed, returning error response");
                return middleware_response;
            }
        };

        if request.has_files() {
            debug!("  Files count: {}", request.get_file_count());
        }

        if request.is_form() {
            let form_data = request.get_form_data();
            debug!("  Form fields: {:?}", form_data);
        }

        // Создаем request_data для JavaScript handler
        let request_data = request.to_json_map();

        debug!("🔍 Preparing to call handler");
        let request_json = serde_json::to_string(&request_data).unwrap();
        debug!("📝 Request JSON prepared: {} chars", request_json.len());

        // Clone data for transfer to JavaScript
        let request_json_clone = request_json.clone();

        // Create channel for receiving result
        let (tx, rx) = std::sync::mpsc::channel();

        // Get event queue for JavaScript communication
        let event_queue = crate::types::get_event_queue();
        let channel = {
            let event_queue_map = event_queue.read().unwrap();
            event_queue_map.clone()
        };

        if let Some(channel) = channel {
            debug!("🔍 Sending request to JavaScript handler");
            let _join_handle = channel.send(move |mut cx| {
                // Call global function getHandler
                let global: Handle<JsObject> = cx.global("global")?;
                let get_handler_fn: Handle<JsFunction> = global.get(&mut cx, "getHandler")?;

                // Call getHandler(requestJson, timeout) - it returns a Promise
                let result: Handle<JsValue> = get_handler_fn
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
                        .unwrap_or_else(|_| cx.string("Failed to convert result"));
                    let _ = tx.send(result_string.value(&mut cx));
                }

                Ok(())
            });

            // Wait for result from JavaScript
            let result = match rx.recv() {
                Ok(result) => result,
                Err(_) => format!(
                    "Failed to receive result from JavaScript handler: {} {}",
                    method, registered_path
                ),
            };

            // Parse JSON response from JavaScript
            let response_json_value: serde_json::Value = serde_json::from_str(&result).unwrap_or_else(|_| {
                serde_json::json!({"content": format!("Failed to parse JS response: {}", result), "contentType": "text/plain"})
            });

            // Use response content from handler
            let response_text = response_json_value["content"]
                .as_str()
                .unwrap_or("")
                .to_string();

            info!(
                "🚀 Dynamic handler completed - END: {:?}",
                request.get_headers()
            );

            let status = response_json_value["status"]
                .as_u64()
                .map(|s| s as u16)
                .unwrap_or(200);
            let content_type = response_json_value["contentType"]
                .as_str()
                .unwrap_or("text/plain");

            // Create response_builder for Axum compatibility
            let mut response_builder = axum::response::Response::builder().status(status);

            debug!("🔍 Setting status: {}", status);
            debug!("🔍 Setting content-type: {}", content_type);

            // Set content-type from header
            response_builder = response_builder.header("content-type", content_type);

            // Add headers from Response object (excluding system headers to avoid duplication)
            if !request.headers.is_empty() {
                for (key, value) in &request.headers {
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

            // Add headers from JavaScript response (excluding system headers)
            if let Some(headers) = response_json_value["headers"].as_object() {
                for (key, value) in headers {
                    let key_lower = key.to_lowercase();
                    // Skip system headers that Axum sets automatically
                    if ![
                        "status",
                        "content-type",
                        "content-length",
                        "transfer-encoding",
                        "connection",
                        "keep-alive",
                    ]
                    .contains(&key_lower.as_str())
                    {
                        // Exclude service header status
                        if let Some(value_str) = value.as_str() {
                            response_builder = response_builder.header(key, value_str);
                        } else if let Some(value_array) = value.as_array() {
                            // Process header arrays (e.g., Set-Cookie)
                            for item in value_array {
                                if let Some(item_str) = item.as_str() {
                                    response_builder = response_builder.header(key, item_str);
                                }
                            }
                        }
                    }
                }
            }

            if status >= 400 && content_type == "text/plain" {
                let error_message = response_json_value["content"]
                    .as_str()
                    .unwrap_or("An error occurred");

                let status_code = StatusCode::from_u16(status as u16)
                    .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);

                return crate::html_templates::generate_error_page(
                    status_code,
                    "Error",
                    error_message,
                    None,
                    dev_mode,
                );
            }

            response_builder.body(Body::from(response_text)).unwrap()
        } else {
            // Channel unavailable, return error
            return crate::html_templates::generate_generic_error_page(
                "Server configuration error",
                Some(&format!(
                    "No channel available for {} {}",
                    method, registered_path
                )),
            );
        }
    } else {
        // Request or Response not found in extensions, return error
        return crate::html_templates::generate_generic_error_page(
            "Server configuration error",
            Some("Request or Response objects not found in extensions"),
        );
    }
}
