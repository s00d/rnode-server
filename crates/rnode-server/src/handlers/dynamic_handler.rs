use crate::request::Request;
use log::{debug, info, warn};
use serde_json;
use axum::http::StatusCode;

use super::javascript_bridge::JavaScriptBridge;
use super::middleware::execute_middleware;
use super::response_builder::ResponseBuilder;
use super::timeout_manager::TimeoutManager;

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
    debug!("  Timeout: {}ms", timeout);

    // Start timing the request
    let timeout_manager = TimeoutManager::new(timeout);
    
    // Получаем готовые Request и Response объекты из extensions
    let request = req.extensions().get::<Request>().cloned();

    if let Some(mut request) = request {
        // Обновляем path и registered_path
        request.path = actual_path.clone();
        request.registered_path = registered_path.clone();
        request.method = method.clone();

        // Извлекаем path параметры
        extract_path_parameters(&mut request, &actual_path, &registered_path);

        // Add query parameters to request
        if let Some(query) = req.uri().query() {
            extract_query_parameters(&mut request, query);
        }

        // Log request details
        log_request_details(&request);

        // Calculate remaining time for middleware execution
        let mut remaining_timeout = timeout_manager.get_remaining_time();
        timeout_manager.log_timeout_status("Middleware execution");

        // Check if we've already exceeded the timeout
        if timeout_manager.is_expired() {
            warn!("⏰ Middleware execution timeout exceeded: {}ms elapsed, {}ms limit", 
                timeout_manager.get_elapsed_time(), timeout_manager.get_total_timeout());
            return crate::html_templates::generate_error_page(
                StatusCode::REQUEST_TIMEOUT,
                "Request Timeout",
                "Request timeout exceeded before middleware execution",
                Some(&format!("Elapsed: {}ms, Limit: {}ms", 
                    timeout_manager.get_elapsed_time(), timeout_manager.get_total_timeout())),
                dev_mode,
            );
        }

        // Execute middleware
        match execute_middleware(&mut request, &mut remaining_timeout, dev_mode).await {
            Ok(()) => {
                debug!("✅ Middleware executed successfully, continuing to handler");
                debug!("⏱️ Remaining time after middleware: {}ms", remaining_timeout);
            }
            Err(middleware_response) => {
                debug!("❌ Middleware failed, returning error response");
                return middleware_response;
            }
        };

        // Log additional request details
        log_additional_request_details(&request);

        // Создаем request_data для JavaScript handler
        let request_data = request.to_json_map();
        let request_json = serde_json::to_string(&request_data).unwrap();
        debug!("📝 Request JSON prepared: {} chars", request_json.len());

        // Calculate remaining time for handler execution
        let handler_remaining_timeout = timeout_manager.get_remaining_time();
        timeout_manager.log_timeout_status("Handler execution");

        // Call JavaScript handler through bridge
        let result = match JavaScriptBridge::call_get_handler(request_json, handler_remaining_timeout) {
            Ok(result) => result,
            Err(_) => {
                // Channel error - return proper JSON error response
                let error_response = serde_json::json!({
                    "content": format!("Failed to receive result from JavaScript handler: {} {}", method, registered_path),
                    "contentType": "text/plain",
                    "status": 500,
                    "error": "channel_error"
                });
                error_response.to_string()
            }
        };

        // Parse JSON response from JavaScript
        debug!("🔍 Raw result from JavaScript: '{}'", result);
        let response_json_value: serde_json::Value = serde_json::from_str(&result).unwrap_or_else(|_| {
            warn!("❌ Failed to parse JS response as JSON: '{}'", result);
            serde_json::json!({"content": format!("Failed to parse JS response: {}", result), "contentType": "text/plain", "status": 500})
        });
        
        debug!("🔍 Parsed response JSON: {:?}", response_json_value);

        info!(
            "🚀 Dynamic handler completed - END: {:?}",
            request.get_headers()
        );

        // Build response using ResponseBuilder
        ResponseBuilder::from_json_response(response_json_value, dev_mode)
    } else {
        // Request or Response not found in extensions, return error
        crate::html_templates::generate_generic_error_page(
            "Server configuration error",
            Some("Request or Response objects not found in extensions"),
        )
    }
}

// Extract path parameters from URL
fn extract_path_parameters(request: &mut Request, actual_path: &str, registered_path: &str) {
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
}

// Extract query parameters from URL
fn extract_query_parameters(request: &mut Request, query: &str) {
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

// Log request details
fn log_request_details(request: &Request) {
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
}

// Log additional request details
fn log_additional_request_details(request: &Request) {
    if request.has_files() {
        debug!("  Files count: {}", request.get_file_count());
    }

    if request.is_form() {
        let form_data = request.get_form_data();
        debug!("  Form fields: {:?}", form_data);
    }
}
