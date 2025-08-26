use neon::prelude::*;
use serde_json;
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

/// Helper function to wait for promise completion
/// This function can be reused across different modules
pub async fn wait_for_promise_completion(
    promise_id: &str,
    event_queue: &'static std::sync::RwLock<Option<neon::event::Channel>>,
    timeout: u64, // Timeout in milliseconds
) -> Result<serde_json::Value, String> {
    let mut attempts = 0;
    let max_attempts = (timeout / 100) as usize; // Calculate attempts based on timeout (100ms intervals)

    loop {
        attempts += 1;

        // Call getPromiseResult to check status
        let promise_status = {
            let event_queue_map = event_queue.read().unwrap();
            if let Some(channel) = event_queue_map.clone() {
                let (tx, rx) = mpsc::channel();
                let promise_id_clone = promise_id.to_string();
                let _join_handle = channel.send(move |mut cx| {
                    let global: Handle<JsObject> = cx.global("global")?;
                    let get_result_fn: Handle<JsFunction> =
                        global.get(&mut cx, "getPromiseResult")?;

                    let result: Handle<JsValue> = get_result_fn
                        .call_with(&mut cx)
                        .arg(cx.string(&promise_id_clone))
                        .apply(&mut cx)?;

                    let result_string = result
                        .to_string(&mut cx)
                        .unwrap_or_else(|_| cx.string("{}"));
                    let _ = tx.send(result_string.value(&mut cx));
                    Ok(())
                });

                rx.recv_timeout(Duration::from_millis(100))
                    .unwrap_or_else(|_| "{}".to_string())
            } else {
                "{}".to_string()
            }
        };

        // Parse promise status
        let status_json: serde_json::Value =
            serde_json::from_str(&promise_status).unwrap_or_else(|_| serde_json::json!({}));

        // Check if promise is still pending
        if let Some(status) = status_json.get("status") {
            if status.as_str() == Some("pending") {
                if attempts >= max_attempts {
                    // Clean up the timed out promise using clearPromiseById
                    let _cleanup_result = {
                        let event_queue_map = event_queue.read().unwrap();
                        if let Some(channel) = event_queue_map.clone() {
                            let (tx, rx) = mpsc::channel();
                            let promise_id_clone = promise_id.to_string();
                            let _join_handle = channel.send(move |mut cx| {
                                let global: Handle<JsObject> = cx.global("global")?;
                                let clear_fn: Handle<JsFunction> =
                                    global.get(&mut cx, "clearPromiseById")?;

                                let result: Handle<JsValue> = clear_fn
                                    .call_with(&mut cx)
                                    .arg(cx.string(&promise_id_clone))
                                    .apply(&mut cx)?;

                                let result_string = result
                                    .to_string(&mut cx)
                                    .unwrap_or_else(|_| cx.string("{}"));
                                let _ = tx.send(result_string.value(&mut cx));
                                Ok(())
                            });

                            rx.recv_timeout(Duration::from_millis(100))
                                .unwrap_or_else(|_| "{}".to_string())
                        } else {
                            "{}".to_string()
                        }
                    };

                    return Err(format!(
                        "Timeout waiting for promise {} to complete (cleaned up)",
                        promise_id
                    ));
                }

                // Wait 100ms before next check
                thread::sleep(Duration::from_millis(100));
                continue;
            } else if status.as_str() == Some("completed") {
                // Promise completed, extract the result and return
                let promise_result = if let Some(result_field) = status_json.get("result") {
                    result_field.clone()
                } else {
                    serde_json::json!({"error": "No result found in promise response"})
                };

                return Ok(promise_result);
            }
        }

        // If we get here, promise status is unknown
        break;
    }

    Err("Promise status unknown".to_string())
}
