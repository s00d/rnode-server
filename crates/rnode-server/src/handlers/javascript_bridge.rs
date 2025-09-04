use neon::prelude::*;
use serde_json;
use std::sync::mpsc;

// Мост для взаимодействия с JavaScript
pub struct JavaScriptBridge;

impl JavaScriptBridge {
    // Вызов JavaScript функции getHandler
    pub fn call_get_handler(
        request_json: String,
        timeout: u64,
    ) -> Result<String, String> {
        let (tx, rx) = mpsc::channel();
        
        // Get event queue for JavaScript communication
        let event_queue = crate::types::get_event_queue();
        let channel = {
            let event_queue_map = event_queue.read().unwrap();
            event_queue_map.clone()
        };

        if let Some(channel) = channel {
            let request_json_clone = request_json.clone();
            
            let _join_handle = channel.send(move |mut cx| {
                // Вызываем глобальную функцию getHandler
                let global: Handle<JsObject> = cx.global("global")?;
                let get_handler_fn: Handle<JsFunction> = global.get(&mut cx, "getHandler")?;

                // Вызываем getHandler(requestJson, timeout) - возвращает Promise
                let result: Handle<JsValue> = get_handler_fn
                    .call_with(&mut cx)
                    .arg(cx.string(&request_json_clone))
                    .arg(cx.number(timeout as f64))
                    .apply(&mut cx)?;

                // Check if result is Promise
                if result.is_a::<JsPromise, _>(&mut cx) {
                    let promise: Handle<JsPromise> = result.downcast_or_throw(&mut cx)?;

                    // Convert JavaScript Promise to Rust Future
                    let promise_future = promise.to_future(&mut cx, |mut cx, result| {
                        let value = result.or_throw(&mut cx)?;
                        let result_string = value
                            .to_string(&mut cx)
                            .unwrap_or_else(|_| cx.string("Failed to convert promise result"));
                        Ok(result_string.value(&mut cx))
                    })?;

                    // Run async task in separate thread with timeout control
                    let _channel = cx.channel();
                    let tx_clone = tx.clone();

                    let _thread_handle = std::thread::spawn(move || {
                        let rt = tokio::runtime::Builder::new_current_thread()
                            .enable_all()
                            .build()
                            .unwrap();

                        rt.block_on(async {
                            match tokio::time::timeout(
                                tokio::time::Duration::from_millis(timeout),
                                promise_future
                            ).await {
                                Ok(result) => {
                                    match result {
                                        Ok(result_string) => {
                                            let _ = tx_clone.send(result_string);
                                        }
                                        Err(err) => {
                                            let error_response = serde_json::json!({
                                                "content": format!("Promise failed: {:?}", err),
                                                "contentType": "text/plain",
                                                "status": 500,
                                                "error": "promise_failed"
                                            });
                                            let _ = tx_clone.send(error_response.to_string());
                                        }
                                    }
                                }
                                Err(_) => {
                                    let timeout_response = serde_json::json!({
                                        "content": format!("Handler timeout after {}ms", timeout),
                                        "contentType": "text/plain",
                                        "status": 408,
                                        "error": "timeout"
                                    });
                                    let _ = tx_clone.send(timeout_response.to_string());
                                }
                            }
                        });
                    });
                } else {
                    // Not promise, convert directly
                    let result_string = result
                        .to_string(&mut cx)
                        .unwrap_or_else(|_| cx.string("Failed to convert result"));
                    let _ = tx.send(result_string.value(&mut cx));
                }

                Ok(())
            });

            // Wait for result from JavaScript
            match rx.recv() {
                Ok(result) => Ok(result),
                Err(_) => {
                    let error_response = serde_json::json!({
                        "content": format!("Failed to receive result from JavaScript handler"),
                        "contentType": "text/plain",
                        "status": 500,
                        "error": "channel_error"
                    });
                    Ok(error_response.to_string())
                }
            }
        } else {
            Err("No channel available".to_string())
        }
    }

    // Call JavaScript function executeMiddleware
    pub fn call_execute_middleware(
        request_json: String,
        timeout: u64,
    ) -> Result<String, String> {
        let (tx, rx) = mpsc::channel();
        
        let event_queue = crate::types::get_event_queue();
        let channel = {
            let event_queue_map = event_queue.read().unwrap();
            event_queue_map.clone()
        };

        if let Some(channel) = channel {
            let request_json_clone = request_json.clone();
            
            let _join_handle = channel.send(move |mut cx| {
                let global: Handle<JsObject> = cx.global("global")?;
                let execute_middleware_fn: Handle<JsFunction> =
                    global.get(&mut cx, "executeMiddleware")?;

                let result: Handle<JsValue> = execute_middleware_fn
                    .call_with(&mut cx)
                    .arg(cx.string(&request_json_clone))
                    .arg(cx.number(timeout as f64))
                    .apply(&mut cx)?;

                if result.is_a::<JsPromise, _>(&mut cx) {
                    let promise: Handle<JsPromise> = result.downcast_or_throw(&mut cx)?;

                    let promise_future = promise.to_future(&mut cx, |mut cx, result| {
                        let value = result.or_throw(&mut cx)?;
                        let result_string = value
                            .to_string(&mut cx)
                            .unwrap_or_else(|_| cx.string("Failed to convert promise result"));
                        Ok(result_string.value(&mut cx))
                    })?;

                    let _channel = cx.channel();
                    let tx_clone = tx.clone();
                    let timeout_clone = timeout;

                    let _thread_handle = std::thread::spawn(move || {
                        let rt = tokio::runtime::Builder::new_current_thread()
                            .enable_all()
                            .build()
                            .unwrap();

                        rt.block_on(async {
                            match tokio::time::timeout(
                                tokio::time::Duration::from_millis(timeout_clone),
                                promise_future
                            ).await {
                                Ok(result) => {
                                    match result {
                                        Ok(result_string) => {
                                            let _ = tx_clone.send(result_string);
                                        }
                                        Err(err) => {
                                            let error_msg = format!("Promise failed: {:?}", err);
                                            let _ = tx_clone.send(error_msg);
                                        }
                                    }
                                }
                                Err(_) => {
                                    let _ = tx_clone.send(format!("Middleware timeout after {}ms", timeout_clone));
                                }
                            }
                        });
                    });
                } else {
                    let result_string = result
                        .to_string(&mut cx)
                        .unwrap_or_else(|_| cx.string("Failed to handle middleware result"));
                    let _ = tx.send(result_string.value(&mut cx));
                }

                Ok(())
            });

            match rx.recv() {
                Ok(result) => Ok(result),
                Err(_) => Err("Failed to receive middleware result".to_string())
            }
        } else {
            Err("No event queue available".to_string())
        }
    }
}
