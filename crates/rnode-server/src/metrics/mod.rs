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

pub fn render_metrics() -> String {
    let encoder = TextEncoder::new();
    let mut buffer = vec![];

    // Encode all metrics from default registry
    encoder
        .encode(&prometheus::gather(), &mut buffer)
        .expect("Failed to encode metrics");

    String::from_utf8(buffer).expect("Failed to convert bytes to string")
}