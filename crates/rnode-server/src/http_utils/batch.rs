use neon::prelude::*;
use serde_json;
use log::{debug, error, info};
use std::collections::HashMap;
use futures::future::join_all;
use crate::http_utils::client::make_http_request;

// Batch HTTP requests utility
pub fn http_batch(mut cx: FunctionContext) -> JsResult<JsString> {
    let requests_json = cx.argument::<JsString>(0)?.value(&mut cx);
    let timeout = cx.argument::<JsNumber>(1)?.value(&mut cx) as u64;

    info!("🔄 Batch HTTP requests with timeout: {}ms", timeout);
    debug!("📝 Requests: {}", requests_json);

    // Parse requests array
    let requests: Vec<serde_json::Value> = serde_json::from_str(&requests_json)
        .unwrap_or_else(|_| Vec::new());

    // Create channel for receiving results
    let (tx, rx) = std::sync::mpsc::channel();

    // Spawn async task in separate thread
    std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();

        rt.block_on(async {
            let results = execute_batch_requests(requests, timeout).await;
            let _ = tx.send(results);
        });
    });

    // Wait for results
    let results = rx.recv().unwrap_or_else(|_| {
        error!("❌ Failed to receive batch HTTP requests results");
        serde_json::json!({
                "success": false,
                "error": "Failed to receive batch HTTP requests results",
                "results": []
            }).to_string()
    });

    Ok(cx.string(results))
}

// Async function to execute batch requests
pub async fn execute_batch_requests(
    requests: Vec<serde_json::Value>,
    timeout_ms: u64,
) -> String {
    let mut futures = Vec::new();

    for (index, request) in requests.iter().enumerate() {
        let method = request["method"].as_str().unwrap_or("GET").to_string();
        let url = request["url"].as_str().unwrap_or("").to_string();
        let headers: HashMap<String, String> = request["headers"]
            .as_object()
            .map(|obj| {
                obj.iter()
                    .map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string()))
                    .collect()
            })
            .unwrap_or_else(HashMap::new);
        let body = request["body"].as_str().map(|s| s.to_string());

        let method_clone = method.clone();
        let url_clone = url.clone();
        let headers_clone = headers.clone();
        let body_clone = body.clone();
        
        let future = async move {
            let result = make_http_request(method_clone, url_clone, headers_clone, body_clone, timeout_ms).await;
            // Add request index to result for association
            let mut result_json: serde_json::Value = serde_json::from_str(&result).unwrap_or_else(|_| serde_json::json!({}));
            result_json["requestIndex"] = serde_json::Value::Number(serde_json::Number::from(index));
            result_json.to_string()
        };
        futures.push(future);
    }

    // Execute all requests concurrently
    let results = join_all(futures).await;

    let batch_response = serde_json::json!({
        "success": true,
        "count": results.len(),
        "results": results
    });

    info!("✅ Batch HTTP requests completed: {} requests", results.len());
    batch_response.to_string()
}
