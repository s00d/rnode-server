use crate::middleware::execute_middleware;
use crate::promise_utils::wait_for_promise_completion;

use axum::http::HeaderMap;
use base64::Engine;
use futures::stream::{self};
use log::{debug};
use multer::Multipart;
use neon::prelude::*;
use serde_json;
use std::convert::Infallible;
use std::borrow::Cow;

// Helper function to extract client IP address from various headers
fn extract_client_ip(headers: &HeaderMap) -> (String, Vec<String>) {
    // Priority order for IP extraction (most trusted first)
    let ip_headers = [
        "cf-connecting-ip",    // Cloudflare (most trusted)
        "x-real-ip",           // Nginx proxy
        "x-forwarded-for",     // Standard proxy header
        "x-client-ip",         // Custom proxy header
        "x-forwarded",         // Alternative proxy header
        "forwarded-for",       // RFC 7239
        "forwarded",           // RFC 7239
        "x-cluster-client-ip", // Load balancer
        "x-remote-ip",         // Custom remote IP
        "x-remote-addr",       // Alternative remote addr
    ];

    let mut all_ips = Vec::new();
    let mut primary_ip = String::new();

    // Try to extract IP from various headers
    for header_name in &ip_headers {
        if let Some(header_value) = headers.get(*header_name) {
            if let Ok(value_str) = header_value.to_str() {
                let ips: Vec<&str> = value_str.split(',').collect();

                // Add all valid IPs to the list
                for ip in &ips {
                    let clean_ip = ip.trim();
                    if !clean_ip.is_empty()
                        && is_valid_ip(clean_ip)
                        && !all_ips.contains(&clean_ip.to_string())
                    {
                        all_ips.push(clean_ip.to_string());
                    }
                }

                // Set primary IP from first valid header found
                if primary_ip.is_empty() && !ips.is_empty() {
                    let first_ip = ips[0].trim();
                    if is_valid_ip(first_ip) {
                        primary_ip = first_ip.to_string();
                    }
                }

                // If we found valid IPs, break (don't check lower priority headers)
                if !primary_ip.is_empty() {
                    break;
                }
            }
        }
    }

    // If no IP found in headers, use default localhost
    if primary_ip.is_empty() {
        primary_ip = "127.0.0.1".to_string();
        if all_ips.is_empty() {
            all_ips.push("127.0.0.1".to_string());
        }
    }

    (primary_ip, all_ips)
}

// Helper function to validate IP address format
fn is_valid_ip(ip: &str) -> bool {
    // Basic IP validation (IPv4 and IPv6)
    if ip.is_empty() {
        return false;
    }

    // Check for private/local IPs that might be invalid
    let invalid_prefixes = [
        "0.",
        "127.",
        "10.",
        "172.16.",
        "172.17.",
        "172.18.",
        "172.19.",
        "172.20.",
        "172.21.",
        "172.22.",
        "172.23.",
        "172.24.",
        "172.25.",
        "172.26.",
        "172.27.",
        "172.28.",
        "172.29.",
        "172.30.",
        "172.31.",
        "192.168.",
        "169.254.",
        "224.",
        "240.",
        "255.255.255.255",
    ];

    for prefix in &invalid_prefixes {
        if ip.starts_with(prefix) && ip != "127.0.0.1" {
            return false;
        }
    }

    // Basic format check (simplified)
    let parts: Vec<&str> = ip.split('.').collect();
    if parts.len() == 4 {
        for part in parts {
            if let Ok(_num) = part.parse::<u8>() {
                // u8 is already 0-255, so no need to check > 255
                // Just verify it's a valid number
            } else {
                return false;
            }
        }
        return true;
    }

    // IPv6 basic check (simplified)
    if ip.contains(':') {
        return ip.len() <= 39 && ip.chars().all(|c| c.is_ascii_hexdigit() || c == ':');
    }

    false
}

// Structure for file information
#[derive(Debug)]
struct FileInfo {
    filename: String,
    content_type: String,
    size: usize,
    data: String, // Base64 encoded data
}

// Structure for multipart parsing result
type MultipartResult = Result<
    (
        std::collections::HashMap<String, String>,
        std::collections::HashMap<String, FileInfo>,
    ),
    Box<dyn std::error::Error>,
>;

// Function for parsing multipart/form-data
async fn parse_multipart_data(
    body_bytes: axum::body::Bytes,
    content_type: &str,
) -> MultipartResult {
    // Get boundary from content-type
    let boundary = content_type
        .split("boundary=")
        .nth(1)
        .ok_or("No boundary found")?;

    // Create stream from bytes
    let stream =
        stream::once(async move { Result::<axum::body::Bytes, Infallible>::Ok(body_bytes) });

    // Create Multipart from stream and boundary
    let mut multipart = Multipart::new(stream, boundary);

    let mut fields = std::collections::HashMap::new();
    let mut files = std::collections::HashMap::new();

    // Parse multipart data
    while let Some(field) = multipart.next_field().await? {
        let field_name = field.name().unwrap_or("unknown").to_string();

        if let Some(filename) = field.file_name() {
            // This is a file
            let filename = filename.to_string();
            let field_content_type = field
                .content_type()
                .map(|ct| ct.to_string())
                .unwrap_or_else(|| "application/octet-stream".to_string());

            // Read file content
            let data = field.bytes().await?;
            let size = data.len();

            // Encode to Base64 for JSON transfer
            let data_base64 = base64::engine::general_purpose::STANDARD.encode(&data);

            let file_info = FileInfo {
                filename,
                content_type: field_content_type,
                size,
                data: data_base64,
            };

            files.insert(field_name, file_info);
        } else {
            // This is a regular form field
            let value = field.text().await?;
            fields.insert(field_name, value);
        }
    }

    Ok((fields, files))
}

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
    timeout: u64, // Timeout from app options
    dev_mode: bool, // Dev mode from app options
) -> axum::response::Response<axum::body::Body> {
    debug!("🔍 Dynamic handler called:");
    debug!("  Method: {}", method);
    debug!("  Actual path: {}", actual_path);
    debug!("  Registered path: {}", registered_path);
    debug!("  Handler ID: {}", _handler_id);
    use axum::body::Body;
    use axum::http::StatusCode;
    use axum::response::Response;

    // Break down Request into parts to extract body
    let (parts, body) = req.into_parts();

    // Parameters already extracted via Axum extractors
    let uri = parts.uri.clone();
    let query_string = uri.query().unwrap_or("");

    // Extract cookies from headers
    let cookies = parts
        .headers
        .get("cookie")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    // Extract all headers
    let mut headers_json = serde_json::Map::new();
    for (key, value) in &parts.headers {
        let key_str = key.as_str().to_string();
        if let Ok(value_str) = value.to_str() {
            headers_json.insert(key_str, serde_json::Value::String(value_str.to_string()));
        }
    }

    // Clone headers for IP source detection
    let headers_for_ip_source = headers_json.clone();

    // Extract IP address from headers
    let (ip, ips) = extract_client_ip(&parts.headers);

    // Determine Content-Type for proper parsing
    let content_type = parts
        .headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    // First get bytes from body
    let body_bytes = axum::body::to_bytes(body, usize::MAX)
        .await
        .unwrap_or_else(|_| axum::body::Bytes::new());

    // Parse body based on Content-Type
    let (body_data, files_data) = if content_type.contains("multipart/form-data") {
        // Parse multipart/form-data
        match parse_multipart_data(body_bytes.clone(), &content_type).await {
            Ok((fields, files)) => {
                // Create JSON for form fields
                let mut fields_json = serde_json::Map::new();
                for (key, value) in fields {
                    fields_json.insert(key, serde_json::Value::String(value));
                }

                // Create JSON for files
                let mut files_json = serde_json::Map::new();
                for (key, file_info) in files {
                    let mut file_json = serde_json::Map::new();
                    file_json.insert(
                        "filename".to_string(),
                        serde_json::Value::String(file_info.filename),
                    );
                    file_json.insert(
                        "contentType".to_string(),
                        serde_json::Value::String(file_info.content_type),
                    );
                    file_json.insert(
                        "size".to_string(),
                        serde_json::Value::Number(serde_json::Number::from(file_info.size)),
                    );
                    file_json.insert(
                        "data".to_string(),
                        serde_json::Value::String(file_info.data),
                    );
                    files_json.insert(key, serde_json::Value::Object(file_json));
                }

                (
                    serde_json::Value::Object(fields_json),
                    serde_json::Value::Object(files_json),
                )
            }
            Err(_) => {
                // Fallback to regular body
                let body_string = String::from_utf8_lossy(&body_bytes).to_string();
                (
                    serde_json::Value::String(body_string),
                    serde_json::Value::Null,
                )
            }
        }
    } else if content_type.contains("application/json") {
        // Parse JSON content
        match serde_json::from_slice::<serde_json::Value>(&body_bytes) {
            Ok(json_value) => {
                // JSON successfully parsed
                (json_value, serde_json::Value::Null)
            }
            Err(_) => {
                // JSON parsing failed, fallback to string
                let body_string = String::from_utf8_lossy(&body_bytes).to_string();
                (
                    serde_json::Value::String(body_string),
                    serde_json::Value::Null,
                )
            }
        }
    } else if content_type.contains("application/x-www-form-urlencoded") {
        // Parse form-urlencoded content
        let body_string = String::from_utf8_lossy(&body_bytes).to_string();
        let mut form_data = serde_json::Map::new();
        
        for pair in body_string.split('&') {
            if let Some((key, value)) = pair.split_once('=') {
                let decoded_key = urlencoding::decode(key).unwrap_or_else(|_| Cow::Borrowed(key)).into_owned();
                let decoded_value = urlencoding::decode(value).unwrap_or_else(|_| Cow::Borrowed(value)).into_owned();
                form_data.insert(decoded_key, serde_json::Value::String(decoded_value));
            }
        }
        
        (
            serde_json::Value::Object(form_data),
            serde_json::Value::Null,
        )
    } else if content_type.contains("text/") || content_type.contains("application/xml") || content_type.contains("application/javascript") {
        // Handle text-based content types
        let body_string = String::from_utf8_lossy(&body_bytes).to_string();
        (
            serde_json::Value::String(body_string),
            serde_json::Value::Null,
        )
    } else if content_type.contains("application/octet-stream") || content_type.contains("image/") || content_type.contains("video/") || content_type.contains("audio/") {
        // Handle binary content types
        let data_base64 = base64::engine::general_purpose::STANDARD.encode(&body_bytes);
        let mut binary_data = serde_json::Map::new();
        binary_data.insert("type".to_string(), serde_json::Value::String("binary".to_string()));
        binary_data.insert("data".to_string(), serde_json::Value::String(data_base64));
        binary_data.insert("contentType".to_string(), serde_json::Value::String(content_type.clone()));
        binary_data.insert("size".to_string(), serde_json::Value::Number(serde_json::Number::from(body_bytes.len())));
        
        (
            serde_json::Value::Object(binary_data),
            serde_json::Value::Null,
        )
    } else {
        // Default case: treat as string
        let body_string = String::from_utf8_lossy(&body_bytes).to_string();
        (
            serde_json::Value::String(body_string),
            serde_json::Value::Null,
        )
    };

    // Create JSON object with parameters
    let mut request_data = serde_json::Map::new();
    request_data.insert(
        "method".to_string(),
        serde_json::Value::String(method.clone()),
    );
    request_data.insert(
        "registeredPath".to_string(),
        serde_json::Value::String(registered_path.clone()),
    );
    request_data.insert(
        "path".to_string(),
        serde_json::Value::String(actual_path.clone()),
    ); // Actual path for req.url
    request_data.insert("body".to_string(), body_data); // Request body (form fields or regular body)
    request_data.insert("files".to_string(), files_data); // Files (if any)
    request_data.insert(
        "contentType".to_string(),
        serde_json::Value::String(content_type),
    ); // Content-Type
    request_data.insert("cookies".to_string(), serde_json::Value::String(cookies)); // Cookies from headers
    request_data.insert(
        "headers".to_string(),
        serde_json::Value::Object(headers_json),
    ); // All headers
    request_data.insert("ip".to_string(), serde_json::Value::String(ip)); // IP address
    request_data.insert(
        "ips".to_string(),
        serde_json::Value::Array(ips.into_iter().map(serde_json::Value::String).collect()),
    ); // All IPs

    // Add IP source information for debugging
    let ip_headers = [
        "cf-connecting-ip",    // Cloudflare (most trusted)
        "x-real-ip",           // Nginx proxy
        "x-forwarded-for",     // Standard proxy header
        "x-client-ip",         // Custom proxy header
        "x-forwarded",         // Alternative proxy header
        "forwarded-for",       // RFC 7239
        "forwarded",           // RFC 7239
        "x-cluster-client-ip", // Load balancer
        "x-remote-ip",         // Custom remote IP
        "x-remote-addr",       // Alternative remote addr
    ];
    
    let ip_source = ip_headers
        .iter()
        .find(|&&header| headers_for_ip_source.contains_key(header))
        .unwrap_or(&"default");

    request_data.insert(
        "ipSource".to_string(),
        serde_json::Value::String(ip_source.to_string()),
    ); // Source header for IP

    // Extract path parameters (e.g., :id -> 123 or {*filepath} -> documents/2024/january/record.png)
    let mut path_params_json = serde_json::Map::new();
    let actual_segments: Vec<&str> = actual_path.split('/').collect();
    let registered_segments: Vec<&str> = registered_path.split('/').collect();

    // Process simple parameters like :id
    if actual_segments.len() == registered_segments.len() {
        for (i, registered_seg) in registered_segments.iter().enumerate() {
            if registered_seg.starts_with(':') && i < actual_segments.len() {
                let param_name = &registered_seg[1..]; // Remove :
                let param_value = actual_segments[i];
                path_params_json.insert(
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
                    path_params_json.insert(
                        param_name.to_string(),
                        serde_json::Value::String(param_value.to_string()),
                    );
                }
            }
        }
    }

    // Process wildcard parameters like {*filepath}
    for (i, registered_seg) in registered_segments.iter().enumerate() {
        if registered_seg.contains("{*") && registered_seg.ends_with("}") {
            // Extract parameter name from {*param}
            let param_name = registered_seg
                .trim_start_matches("{*")
                .trim_end_matches("}");

            if i < actual_segments.len() {
                // For wildcard parameter take all remaining segments
                let param_value = actual_segments[i..].join("/");
                if !param_value.is_empty() {
                    debug!(
                        "📁 Wildcard parameter {{*{}}}: '{}'",
                        param_name, param_value
                    );
                    path_params_json.insert(
                        param_name.to_string(),
                        serde_json::Value::String(param_value),
                    );
                }
            }
        }
    }

    // Parse query parameters
    let mut query_params_json = serde_json::Map::new();
    if !query_string.is_empty() {
        for pair in query_string.split('&') {
            if let Some((key, value)) = pair.split_once('=') {
                query_params_json.insert(
                    key.to_string(),
                    serde_json::Value::String(value.to_string()),
                );
            }
        }
    }

    request_data.insert(
        "pathParams".to_string(),
        serde_json::Value::Object(path_params_json.clone()),
    );
    request_data.insert(
        "queryParams".to_string(),
        serde_json::Value::Object(query_params_json.clone()),
    );

    // Execute middleware after extracting all parameters
            match execute_middleware(&mut request_data, timeout, dev_mode).await {
        Ok(()) => (), // Middleware successfully executed, request_data modified
        Err(middleware_response) => return middleware_response,
    };

    let request_json = serde_json::to_string(&request_data).unwrap();

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

            // Convert result to string and send it
            let result_string = result
                .to_string(&mut cx)
                .unwrap_or_else(|_| cx.string("Failed to convert result"));
            let _ = tx.send(result_string.value(&mut cx));

            Ok(())
        });

        // Wait for result from JavaScript (using timeout from app options)
        let result = match rx.recv_timeout(std::time::Duration::from_millis(timeout)) {
            Ok(result) => result,
            Err(_) => format!(
                "Timeout waiting for JavaScript handler: {} {}",
                method, registered_path
            ),
        };

        // Parse JSON response from JavaScript
        let mut response_json_value: serde_json::Value = serde_json::from_str(&result).unwrap_or_else(|_| {
            serde_json::json!({"content": format!("Failed to parse JS response: {}", result), "contentType": "text/plain"})
        });

        // Check if this is an async response
        if let Some(async_flag) = response_json_value.get("__async") {
            if async_flag.as_bool().unwrap_or(false) {
                // This is an async response, we need to wait for the result
                debug!("🔄 Async response detected, waiting for result...");

                // Get promise ID for tracking
                let promise_id = response_json_value
                    .get("__promiseId")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");

                debug!("🔄 Waiting for promise {} to complete...", promise_id);

                // Wait for the promise to complete using the new logic
                match wait_for_promise_completion(promise_id, timeout).await {
                    Ok(promise_result) => {
                        debug!("✅ Promise {} completed, using result: {}", promise_id, promise_result);
                        // Replace response_json_value with the final result
                        response_json_value = promise_result;
                    }
                    Err(error_msg) => {
                        debug!("❌ Promise {} failed: {}", promise_id, error_msg);
                        // Don't try to clean up the promise to avoid channel errors
                        // The promise will be cleaned up automatically by the PromiseStore
                        
                        return crate::html_templates::generate_timeout_error_page(
                            timeout,
                            Some(&error_msg)
                        );
                    }
                }
            }
        }

        // Use response content from handler (middleware only sets headers, not content)
        let response_text = response_json_value["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        // Use response content type from handler (middleware only sets headers, not content)
        let content_type = response_json_value["contentType"]
            .as_str()
            .unwrap_or("text/plain")
            .to_string();

        // Create response with headers
        let mut response_builder = Response::builder().header("content-type", content_type);

        // Process status code from JavaScript response headers
        let mut status_code = StatusCode::OK;
        if let Some(headers) = response_json_value["headers"].as_object() {
            if let Some(status_str) = headers.get("status").and_then(|v| v.as_str()) {
                if let Ok(status_u16) = status_str.parse::<u16>() {
                    status_code = StatusCode::from_u16(status_u16).unwrap_or(StatusCode::OK);
                }
            }
        }
        response_builder = response_builder.status(status_code);

        // Add headers from middleware first
        if let Some(middleware_headers) = request_data
            .get("responseHeaders")
            .and_then(|h| h.as_object())
        {
            debug!(
                "🔧 Adding middleware headers to response: {:?}",
                middleware_headers
            );
            for (key, value) in middleware_headers {
                if let Some(value_str) = value.as_str() {
                    response_builder = response_builder.header(key, value_str);
                }
            }
        }

        // Add headers from JavaScript response (excluding service header status)
        if let Some(headers) = response_json_value["headers"].as_object() {
            for (key, value) in headers {
                if key != "status" {
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

        response_builder.body(Body::from(response_text)).unwrap()
    } else {
        // Channel unavailable, return error
        return crate::html_templates::generate_generic_error_page(
            "Server configuration error",
            Some(&format!("No channel available for {} {}", method, registered_path))
        );
    }
}
