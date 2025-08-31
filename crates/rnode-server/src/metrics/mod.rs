use prometheus::{Encoder, TextEncoder};
use std::sync::OnceLock;

// Import submodules
pub mod http;
pub mod system;
pub mod business;
pub mod websocket;

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

pub fn record_websocket_message_sent(message_type: &str, room_id: Option<&str>, path: &str, size: usize) {
    if METRICS_INITIALIZED.get().is_some() {
        websocket::record_message_sent(message_type, room_id, path, size);
    }
}

pub fn record_websocket_message_received(message_type: &str, room_id: Option<&str>, path: &str, size: usize) {
    if METRICS_INITIALIZED.get().is_some() {
        websocket::record_message_received(message_type, room_id, path, size);
    }
}

pub fn record_websocket_error(error_type: &str, path: &str, room_id: Option<&str>) {
    if METRICS_INITIALIZED.get().is_some() {
        websocket::record_error(error_type, path, room_id);
    }
}



pub fn update_websocket_metrics() {
    if METRICS_INITIALIZED.get().is_some() {
        websocket::update_websocket_metrics();
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
