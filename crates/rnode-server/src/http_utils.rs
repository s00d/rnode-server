use neon::prelude::*;
use serde_json;
use log::{debug, error, info, warn};
use std::collections::HashMap;

// HTTP client utility for making requests from the backend
pub fn http_request(mut cx: FunctionContext) -> JsResult<JsString> {
    let method = cx.argument::<JsString>(0)?.value(&mut cx);
    let url = cx.argument::<JsString>(1)?.value(&mut cx);
    let headers_json = cx.argument::<JsString>(2)?.value(&mut cx);
    let body_json = cx.argument::<JsString>(3)?.value(&mut cx);
    let timeout = cx.argument::<JsNumber>(4)?.value(&mut cx) as u64;

    info!("🌐 HTTP request: {} {}", method, url);
    debug!("📝 Headers: {}", headers_json);
    debug!("📝 Body: {}", body_json);
    debug!("⏱️ Timeout: {}ms", timeout);

    // Parse headers
    let headers: HashMap<String, String> = serde_json::from_str(&headers_json)
        .unwrap_or_else(|_| HashMap::new());

    // Parse body
    let body = if body_json.is_empty() {
        None
    } else {
        Some(body_json)
    };

    // Create channel for receiving result
    let (tx, rx) = std::sync::mpsc::channel();

    // Spawn async task in separate thread
    std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();

        rt.block_on(async {
            let result = make_http_request(method.clone(), url.clone(), headers.clone(), body.clone(), timeout).await;
            let _ = tx.send(result);
        });
    });

    // Wait for result
    let result = match rx.recv() {
        Ok(result) => result,
        Err(_) => {
            error!("❌ Failed to receive HTTP request result");
            serde_json::json!({
                "success": false,
                "error": "Failed to receive HTTP request result",
                "status": 500
            }).to_string()
        }
    };

    Ok(cx.string(result))
}

// Async function to make HTTP request
async fn make_http_request(
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: Option<String>,
    timeout_ms: u64,
) -> String {
    use tokio::time::Duration;

    // Create HTTP client
    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(timeout_ms))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    // Build request
    let mut request_builder = match method.to_uppercase().as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        "PATCH" => client.patch(&url),
        "HEAD" => client.head(&url),
        "OPTIONS" => client.request(reqwest::Method::OPTIONS, &url),
        _ => {
            warn!("⚠️ Unsupported HTTP method: {}, falling back to GET", method);
            client.get(&url)
        }
    };

    // Add headers
    for (key, value) in headers {
        request_builder = request_builder.header(key, value);
    }

    // Add body if provided
    if let Some(body_content) = body {
        request_builder = request_builder.body(body_content.to_string());
    }

    // Execute request with timeout
    match tokio::time::timeout(Duration::from_millis(timeout_ms), request_builder.send()).await {
        Ok(Ok(response)) => {
            let status = response.status().as_u16();
            let response_headers: HashMap<String, String> = response
                .headers()
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
                .collect();

            // Try to get response body as text
            let body_text = match response.text().await {
                Ok(text) => text,
                Err(_) => "Failed to read response body".to_string(),
            };

            // Try to parse body as JSON, fallback to text
            let body_parsed = if let Ok(json) = serde_json::from_str::<serde_json::Value>(&body_text) {
                json
            } else {
                serde_json::Value::String(body_text.clone())
            };

            info!("✅ HTTP request successful: {} {} -> {}", method, url, status);
            
            let response_data = serde_json::json!({
                "success": true,
                "status": status,
                "headers": response_headers,
                "body": body_parsed,
                "bodyRaw": body_text,
                "url": url,
                "method": method
            });

            response_data.to_string()
        }
        Ok(Err(e)) => {
            error!("❌ HTTP request failed: {} {} -> {:?}", method, url, e);
            let error_response = serde_json::json!({
                "success": false,
                "error": format!("HTTP request failed: {:?}", e),
                "status": 0,
                "url": url,
                "method": method
            });
            error_response.to_string()
        }
        Err(_) => {
            error!("⏰ HTTP request timeout: {} {} after {}ms", method, url, timeout_ms);
            let timeout_response = serde_json::json!({
                "success": false,
                "error": format!("HTTP request timeout after {}ms", timeout_ms),
                "status": 408,
                "url": url,
                "method": method
            });
            timeout_response.to_string()
        }
    }
}



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
    let results = match rx.recv() {
        Ok(results) => results,
        Err(_) => {
            error!("❌ Failed to receive batch HTTP requests results");
            serde_json::json!({
                "success": false,
                "error": "Failed to receive batch HTTP requests results",
                "results": []
            }).to_string()
        }
    };

    Ok(cx.string(results))
}

// Async function to execute batch requests
async fn execute_batch_requests(
    requests: Vec<serde_json::Value>,
    timeout_ms: u64,
) -> String {
    use futures::future::join_all;

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
