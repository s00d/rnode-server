use prometheus::{IntCounter, opts, register_int_counter};
use std::sync::OnceLock;

// Static business metrics using OnceLock
static CACHE_HITS: OnceLock<IntCounter> = OnceLock::new();
static CACHE_MISSES: OnceLock<IntCounter> = OnceLock::new();

pub fn init_business_metrics() {
    // Initialize business logic metrics
    CACHE_HITS
        .set(
            register_int_counter!(opts!("rnode_server_cache_hits_total", "Total cache hits"))
                .expect("Can't create cache hits metric"),
        )
        .expect("CACHE_HITS already initialized");

    CACHE_MISSES
        .set(
            register_int_counter!(opts!(
                "rnode_server_cache_misses_total",
                "Total cache misses"
            ))
            .expect("Can't create cache misses metric"),
        )
        .expect("CACHE_MISSES already initialized");
}

// Business logic metrics functions
pub fn record_cache_hit() {
    if let Some(counter) = CACHE_HITS.get() {
        counter.inc();
    }
}

pub fn record_cache_miss() {
    if let Some(counter) = CACHE_MISSES.get() {
        counter.inc();
    }
}
