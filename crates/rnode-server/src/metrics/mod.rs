use prometheus::{Encoder, TextEncoder};
use std::sync::OnceLock;

// Import submodules
pub mod http;
pub mod system;
pub mod business;
pub mod websocket;
pub mod cache;

// Flag to track if metrics are already initialized
static METRICS_INITIALIZED: OnceLock<bool> = OnceLock::new();

pub fn init_metrics() {
    // Check if metrics are already initialized
    if METRICS_INITIALIZED.get().is_some() {
        return; // Already initialized, skip
    }

    // Mark metrics as initialized
    METRICS_INITIALIZED.set(true).ok();

    // Initialize all metric modules
    http::init_http_metrics();
    system::init_system_metrics();
    business::init_business_metrics();
    websocket::init_websocket_metrics();
    cache::init_cache_metrics();
}

pub fn record_http_request(method: &str, path: &str, status: &str, duration: f64) {
    // Check if metrics are initialized before recording
    if METRICS_INITIALIZED.get().is_some() {
        http::record_http_request(method, path, status, duration);
    }
}

pub fn update_pending_requests(count: i64) {
    // Check if metrics are initialized before recording
    if METRICS_INITIALIZED.get().is_some() {
        http::update_pending_requests(count);
    }
}

// Business logic metrics functions
pub fn record_cache_hit() {
    // Check if metrics are initialized before recording
    if METRICS_INITIALIZED.get().is_some() {
        business::record_cache_hit();
    }
}

pub fn record_cache_miss() {
    // Check if metrics are initialized before recording
    if METRICS_INITIALIZED.get().is_some() {
        business::record_cache_miss();
    }
}

pub fn increment_total_connections() {
    // Check if metrics are initialized before recording
    if METRICS_INITIALIZED.get().is_some() {
        http::increment_total_connections();
    }
}

pub fn update_system_metrics() {
    // Update all metrics only if metrics are initialized
    if METRICS_INITIALIZED.get().is_some() {
        system::update_system_metrics();
    }
}

// WebSocket metrics functions
pub fn record_websocket_connection_start(connection_id: &uuid::Uuid, path: &str, room_id: Option<&str>) {
    if METRICS_INITIALIZED.get().is_some() {
        websocket::record_connection_start(connection_id, path, room_id);
    }
}

pub fn record_websocket_connection_end(connection_id: &uuid::Uuid, path: &str, room_id: Option<&str>) {
    if METRICS_INITIALIZED.get().is_some() {
        websocket::record_connection_end(connection_id, path, room_id);
    }
}

pub fn update_websocket_metrics() {
    if METRICS_INITIALIZED.get().is_some() {
        websocket::update_websocket_metrics();
    }
}

// Cache metrics functions
pub fn record_cache_operation_metric(operation: &str, cache_type: &str, status: &str) {
    if METRICS_INITIALIZED.get().is_some() {
        cache::record_cache_operation(operation, cache_type, status);
    }
}

pub fn record_cache_operation_with_tags_metric(operation: &str, cache_type: &str, status: &str, tags: &[String]) {
    if METRICS_INITIALIZED.get().is_some() {
        cache::record_cache_operation_with_tags(operation, cache_type, status, tags);
    }
}



pub fn record_cache_hit_with_tags_metric(cache_type: &str, key_pattern: &str, tags: &[String]) {
    if METRICS_INITIALIZED.get().is_some() {
        cache::record_cache_hit_with_tags(cache_type, key_pattern, tags);
    }
}

pub fn record_cache_miss_with_tags_metric(cache_type: &str, key_pattern: &str, tags: &[String]) {
    if METRICS_INITIALIZED.get().is_some() {
        cache::record_cache_miss_with_tags(cache_type, key_pattern, tags);
    }
}

pub fn record_cache_error_metric(error_type: &str, cache_type: &str, operation: &str) {
    if METRICS_INITIALIZED.get().is_some() {
        cache::record_cache_error(error_type, cache_type, operation);
    }
}

pub fn record_cache_operation_duration_metric(operation: &str, cache_type: &str, duration_seconds: f64) {
    if METRICS_INITIALIZED.get().is_some() {
        cache::record_cache_operation_duration(operation, cache_type, duration_seconds);
    }
}



pub fn record_tag_operation_metric(operation: &str, cache_type: &str) {
    if METRICS_INITIALIZED.get().is_some() {
        cache::record_tag_operation(operation, cache_type);
    }
}



pub fn render_metrics() -> String {
    let encoder = TextEncoder::new();
    let mut buffer = vec![];

    // Encode all metrics from default registry
    encoder
        .encode(&prometheus::gather(), &mut buffer)
        .expect("Failed to encode metrics");

    String::from_utf8(buffer).expect("Failed to convert bytes to string")
}

// Re-export middleware function
pub use http::track_metrics;
