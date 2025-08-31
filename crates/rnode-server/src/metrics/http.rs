use axum::{body::Body, extract::Request, middleware::Next, response::IntoResponse};
use prometheus::{HistogramVec, IntCounterVec, opts, register_histogram_vec, register_int_counter_vec};
use std::sync::OnceLock;
use std::time::Instant;

// Static HTTP metrics using OnceLock
static HTTP_REQUESTS_TOTAL: OnceLock<IntCounterVec> = OnceLock::new();
static HTTP_REQUESTS_DURATION: OnceLock<HistogramVec> = OnceLock::new();
static HTTP_STATUS_COUNTER: OnceLock<IntCounterVec> = OnceLock::new();
static SLOW_REQUESTS: OnceLock<IntCounterVec> = OnceLock::new();
static PENDING_REQUESTS: OnceLock<prometheus::IntGauge> = OnceLock::new();
static TOTAL_CONNECTIONS: OnceLock<prometheus::IntCounter> = OnceLock::new();

pub fn init_http_metrics() {
    HTTP_REQUESTS_TOTAL
        .set(
            register_int_counter_vec!(
                opts!("http_requests_total", "HTTP requests total"),
                &["method", "path", "status"]
            )
            .expect("Can't create HTTP requests total metric"),
        )
        .expect("HTTP_REQUESTS_TOTAL already initialized");

    HTTP_REQUESTS_DURATION
        .set(
            register_histogram_vec!(
                "http_requests_duration_seconds",
                "HTTP request duration in seconds",
                &["method", "path", "status"],
                vec![
                    0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0
                ]
            )
            .expect("Can't create HTTP requests duration metric"),
        )
        .expect("HTTP_REQUESTS_DURATION already initialized");

    HTTP_STATUS_COUNTER
        .set(
            register_int_counter_vec!(
                opts!("rnode_server_http_status_total", "Total HTTP status codes"),
                &["status", "method", "path"]
            )
            .expect("Can't create HTTP status counter metric"),
        )
        .expect("HTTP_STATUS_COUNTER already initialized");

    SLOW_REQUESTS
        .set(
            register_int_counter_vec!(
                opts!("rnode_server_slow_requests_total", "Total slow requests"),
                &["method", "path", "duration_range"]
            )
            .expect("Can't create slow requests metric"),
        )
        .expect("SLOW_REQUESTS already initialized");

    PENDING_REQUESTS
        .set(
            prometheus::register_int_gauge!(opts!(
                "rnode_server_pending_requests",
                "Number of pending requests"
            ))
            .expect("Can't create pending requests metric"),
        )
        .expect("PENDING_REQUESTS already initialized");

    TOTAL_CONNECTIONS
        .set(
            prometheus::register_int_counter!(opts!(
                "rnode_server_total_connections",
                "Total connections since start"
            ))
            .expect("Can't create total connections metric"),
        )
        .expect("TOTAL_CONNECTIONS already initialized");
}

pub fn record_http_request(method: &str, path: &str, status: &str, duration: f64) {
    if let Some(counter) = HTTP_REQUESTS_TOTAL.get() {
        counter.with_label_values(&[method, path, status]).inc();
    }

    if let Some(histogram) = HTTP_REQUESTS_DURATION.get() {
        histogram
            .with_label_values(&[method, path, status])
            .observe(duration);
    }

    // Record HTTP status separately
    if let Some(status_counter) = HTTP_STATUS_COUNTER.get() {
        status_counter
            .with_label_values(&[status, method, path])
            .inc();
    }

    // Record slow requests (over 1 second)
    if duration > 1.0 {
        if let Some(slow_counter) = SLOW_REQUESTS.get() {
            let duration_range = if duration > 5.0 { "very_slow" } else { "slow" };
            slow_counter
                .with_label_values(&[method, path, duration_range])
                .inc();
        }
    }
}

pub fn update_pending_requests(count: i64) {
    if let Some(gauge) = PENDING_REQUESTS.get() {
        gauge.set(count);
    }
}

pub fn increment_total_connections() {
    if let Some(counter) = TOTAL_CONNECTIONS.get() {
        counter.inc();
    }
}

// Middleware to track HTTP metrics
pub async fn track_metrics(req: Request<Body>, next: Next) -> impl IntoResponse {
    let start = Instant::now();
    let path = if let Some(matched_path) = req.extensions().get::<axum::extract::MatchedPath>() {
        matched_path.as_str().to_owned()
    } else {
        req.uri().path().to_owned()
    };
    let method = req.method().clone();

    // Track new connection
    crate::metrics::increment_total_connections();

    // Increment pending requests counter
    crate::metrics::update_pending_requests(1);

    let response = next.run(req).await;

    let latency = start.elapsed().as_secs_f64();
    let status = response.status().as_u16().to_string();

    // Decrement pending requests counter
    crate::metrics::update_pending_requests(-1);

    // Update Prometheus metrics
    crate::metrics::record_http_request(&method.to_string(), &path, &status, latency);

    response
}
