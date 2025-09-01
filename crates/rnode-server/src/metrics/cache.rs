use prometheus::{IntCounterVec, opts, register_int_counter_vec};
use std::sync::OnceLock;

// Static Cache metrics using OnceLock
static CACHE_OPERATIONS_TOTAL: OnceLock<IntCounterVec> = OnceLock::new();
static CACHE_HITS_TOTAL: OnceLock<IntCounterVec> = OnceLock::new();
static CACHE_MISSES_TOTAL: OnceLock<IntCounterVec> = OnceLock::new();
static CACHE_ERRORS_TOTAL: OnceLock<IntCounterVec> = OnceLock::new();
static CACHE_OPERATION_DURATION: OnceLock<prometheus::HistogramVec> = OnceLock::new();
static CACHE_TAG_OPERATIONS: OnceLock<IntCounterVec> = OnceLock::new();

pub fn init_cache_metrics() {
    CACHE_OPERATIONS_TOTAL
        .set(
            register_int_counter_vec!(
                opts!("rnode_server_data_cache_operations_total", "Total data cache operations"),
                &["operation", "cache_type", "status"]
            )
            .expect("Can't create cache operations total metric"),
        )
        .expect("CACHE_OPERATIONS_TOTAL already initialized");

    CACHE_HITS_TOTAL
        .set(
            register_int_counter_vec!(
                opts!("rnode_server_data_cache_hits_total", "Total data cache hits"),
                &["cache_type", "key_pattern"]
            )
            .expect("Can't create cache hits total metric"),
        )
        .expect("CACHE_HITS_TOTAL already initialized");

    CACHE_MISSES_TOTAL
        .set(
            register_int_counter_vec!(
                opts!("rnode_server_data_cache_misses_total", "Total data cache misses"),
                &["cache_type", "key_pattern"]
            )
            .expect("Can't create cache misses total metric"),
        )
        .expect("CACHE_MISSES_TOTAL already initialized");

    CACHE_ERRORS_TOTAL
        .set(
            register_int_counter_vec!(
                opts!("rnode_server_data_cache_errors_total", "Total data cache errors"),
                &["error_type", "cache_type", "operation"]
            )
            .expect("Can't create cache errors total metric"),
        )
        .expect("CACHE_ERRORS_TOTAL already initialized");



    CACHE_OPERATION_DURATION
        .set(
            prometheus::register_histogram_vec!(
                "rnode_server_data_cache_operation_duration_seconds",
                "Cache operation duration in seconds",
                &["operation", "cache_type"],
                vec![0.001, 0.01, 0.1, 1.0, 10.0, 100.0]
            )
            .expect("Can't create cache operation duration metric"),
        )
        .expect("CACHE_OPERATION_DURATION already initialized");



    CACHE_TAG_OPERATIONS
        .set(
            register_int_counter_vec!(
                opts!("rnode_server_data_cache_tag_operations_total", "Total data cache tag operations"),
                &["operation", "cache_type"]
            )
            .expect("Can't create cache tag operations metric"),
        )
        .expect("CACHE_TAG_OPERATIONS already initialized");


}

// Operation tracking functions
pub fn record_cache_operation(operation: &str, cache_type: &str, status: &str) {
    if let Some(counter) = CACHE_OPERATIONS_TOTAL.get() {
        counter
            .with_label_values(&[operation, cache_type, status])
            .inc();
    }
}

pub fn record_cache_operation_with_tags(operation: &str, cache_type: &str, status: &str, tags: &[String]) {
    if let Some(counter) = CACHE_OPERATIONS_TOTAL.get() {
        counter
            .with_label_values(&[operation, cache_type, status])
            .inc();
    }
    
    // Record tag operation if tags are present
    if !tags.is_empty() {
        record_tag_operation(operation, cache_type);
    }
}



pub fn record_cache_hit_with_tags(cache_type: &str, key_pattern: &str, tags: &[String]) {
    if let Some(counter) = CACHE_HITS_TOTAL.get() {
        counter
            .with_label_values(&[cache_type, key_pattern])
            .inc();
    }
    
    // Record tag operation if tags are present
    if !tags.is_empty() {
        record_tag_operation("hit", cache_type);
    }
}

pub fn record_cache_miss_with_tags(cache_type: &str, key_pattern: &str, tags: &[String]) {
    if let Some(counter) = CACHE_MISSES_TOTAL.get() {
        counter
            .with_label_values(&[cache_type, key_pattern])
            .inc();
    }
    
    // Record tag operation if tags are present
    if !tags.is_empty() {
        record_tag_operation("miss", cache_type);
    }
}

pub fn record_cache_error(error_type: &str, cache_type: &str, operation: &str) {
    if let Some(counter) = CACHE_ERRORS_TOTAL.get() {
        counter
            .with_label_values(&[error_type, cache_type, operation])
            .inc();
    }
}



pub fn record_cache_operation_duration(operation: &str, cache_type: &str, duration_seconds: f64) {
    if let Some(histogram) = CACHE_OPERATION_DURATION.get() {
        histogram
            .with_label_values(&[operation, cache_type])
            .observe(duration_seconds);
    }
}



pub fn record_tag_operation(operation: &str, cache_type: &str) {
    if let Some(counter) = CACHE_TAG_OPERATIONS.get() {
        counter
            .with_label_values(&[operation, cache_type])
            .inc();
    }
}



// Helper function to get key pattern from key
pub fn get_key_pattern(key: &str) -> String {
    if key.contains(':') {
        let parts: Vec<&str> = key.split(':').collect();
        if parts.len() >= 2 {
            return format!("{}:*", parts[0]);
        }
    }
    "default".to_string()
}

