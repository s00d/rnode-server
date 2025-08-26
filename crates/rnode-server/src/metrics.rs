use axum::{body::Body, extract::Request, middleware::Next, response::IntoResponse};
use prometheus::{
    Encoder, HistogramVec, IntCounter, IntCounterVec, IntGauge, TextEncoder, opts,
    register_histogram_vec, register_int_counter, register_int_counter_vec, register_int_gauge,
};
use std::sync::OnceLock;
use std::time::Instant;
use sysinfo::System;

// Flag to track if metrics are already initialized
static METRICS_INITIALIZED: OnceLock<bool> = OnceLock::new();

// Static metrics using OnceLock
static HTTP_REQUESTS_TOTAL: OnceLock<IntCounterVec> = OnceLock::new();
static HTTP_REQUESTS_DURATION: OnceLock<HistogramVec> = OnceLock::new();
static PROCESS_CPU_USAGE: OnceLock<IntGauge> = OnceLock::new();
static PROCESS_MEMORY_USAGE: OnceLock<IntGauge> = OnceLock::new();
static PROCESS_UPTIME: OnceLock<IntGauge> = OnceLock::new();
static SUBPROCESS_COUNT: OnceLock<IntGauge> = OnceLock::new();
static SUBPROCESS_MEMORY: OnceLock<IntGauge> = OnceLock::new();
static SUBPROCESS_CPU: OnceLock<IntGauge> = OnceLock::new();
static SYSTEM_PROCESSES: OnceLock<IntGauge> = OnceLock::new();
static SYSTEM_MEMORY_USED: OnceLock<IntGauge> = OnceLock::new();
static SYSTEM_MEMORY_TOTAL: OnceLock<IntGauge> = OnceLock::new();
static PENDING_REQUESTS: OnceLock<IntGauge> = OnceLock::new();
static SLOW_REQUESTS: OnceLock<IntCounterVec> = OnceLock::new();
static HTTP_STATUS_COUNTER: OnceLock<IntCounterVec> = OnceLock::new();

// Business logic metrics
static CACHE_HITS: OnceLock<IntCounter> = OnceLock::new();
static CACHE_MISSES: OnceLock<IntCounter> = OnceLock::new();

// Connection metrics
static TOTAL_CONNECTIONS: OnceLock<IntCounter> = OnceLock::new();

// Server start time for uptime calculation
static SERVER_START_TIME: OnceLock<Instant> = OnceLock::new();

pub fn init_metrics() {
    // Check if metrics are already initialized
    if METRICS_INITIALIZED.get().is_some() {
        return; // Already initialized, skip
    }

    // Mark metrics as initialized
    METRICS_INITIALIZED.set(true).ok();

    // Initialize all metrics
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

    PROCESS_CPU_USAGE
        .set(
            register_int_gauge!(opts!(
                "rnode_server_process_cpu_usage_percent",
                "Process CPU usage percentage"
            ))
            .expect("Can't create process CPU usage metric"),
        )
        .expect("PROCESS_CPU_USAGE already initialized");

    PROCESS_MEMORY_USAGE
        .set(
            register_int_gauge!(opts!(
                "rnode_server_process_memory_kb",
                "Process memory usage in KB"
            ))
            .expect("Can't create process memory usage metric"),
        )
        .expect("PROCESS_MEMORY_USAGE already initialized");

    PROCESS_UPTIME
        .set(
            register_int_gauge!(opts!(
                "rnode_server_uptime_seconds",
                "Server uptime in seconds"
            ))
            .expect("Can't create process uptime metric"),
        )
        .expect("PROCESS_UPTIME already initialized");

    SUBPROCESS_COUNT
        .set(
            register_int_gauge!(opts!(
                "rnode_server_subprocess_count",
                "Number of subprocesses"
            ))
            .expect("Can't create subprocess count metric"),
        )
        .expect("SUBPROCESS_COUNT already initialized");

    SUBPROCESS_MEMORY
        .set(
            register_int_gauge!(opts!(
                "rnode_server_subprocess_memory_kb",
                "Total subprocess memory usage in KB"
            ))
            .expect("Can't create subprocess memory metric"),
        )
        .expect("SUBPROCESS_MEMORY already initialized");

    SUBPROCESS_CPU
        .set(
            register_int_gauge!(opts!(
                "rnode_server_subprocess_cpu_percent",
                "Total subprocess CPU usage percentage"
            ))
            .expect("Can't create subprocess CPU metric"),
        )
        .expect("SUBPROCESS_CPU already initialized");

    SYSTEM_PROCESSES
        .set(
            register_int_gauge!(opts!(
                "rnode_server_system_processes_total",
                "Total system processes"
            ))
            .expect("Can't create system processes metric"),
        )
        .expect("SYSTEM_PROCESSES already initialized");

    SYSTEM_MEMORY_USED
        .set(
            register_int_gauge!(opts!(
                "rnode_server_system_memory_used_mb",
                "System memory used in MB"
            ))
            .expect("Can't create system memory used metric"),
        )
        .expect("SYSTEM_MEMORY_USED already initialized");

    SYSTEM_MEMORY_TOTAL
        .set(
            register_int_gauge!(opts!(
                "rnode_server_system_memory_total_mb",
                "System total memory in MB"
            ))
            .expect("Can't create system memory total metric"),
        )
        .expect("SYSTEM_MEMORY_TOTAL already initialized");

    PENDING_REQUESTS
        .set(
            register_int_gauge!(opts!(
                "rnode_server_pending_requests",
                "Number of pending requests"
            ))
            .expect("Can't create pending requests metric"),
        )
        .expect("PENDING_REQUESTS already initialized");

    SLOW_REQUESTS
        .set(
            register_int_counter_vec!(
                opts!("rnode_server_slow_requests_total", "Total slow requests"),
                &["method", "path", "duration_range"]
            )
            .expect("Can't create slow requests metric"),
        )
        .expect("SLOW_REQUESTS already initialized");

    HTTP_STATUS_COUNTER
        .set(
            register_int_counter_vec!(
                opts!("rnode_server_http_status_total", "Total HTTP status codes"),
                &["status", "method", "path"]
            )
            .expect("Can't create HTTP status counter metric"),
        )
        .expect("HTTP_STATUS_COUNTER already initialized");

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

    // Initialize connection metrics

    TOTAL_CONNECTIONS
        .set(
            register_int_counter!(opts!(
                "rnode_server_total_connections",
                "Total connections since start"
            ))
            .expect("Can't create total connections metric"),
        )
        .expect("TOTAL_CONNECTIONS already initialized");

    // Set server start time
    SERVER_START_TIME.set(Instant::now()).ok();
}

pub fn record_http_request(method: &str, path: &str, status: &str, duration: f64) {
    // Check if metrics are initialized before recording
    if METRICS_INITIALIZED.get().is_some() {
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
}

pub fn update_pending_requests(count: i64) {
    // Check if metrics are initialized before recording
    if METRICS_INITIALIZED.get().is_some() {
        if let Some(gauge) = PENDING_REQUESTS.get() {
            gauge.set(count);
        }
    }
}

// Business logic metrics functions
pub fn record_cache_hit() {
    // Check if metrics are initialized before recording
    if METRICS_INITIALIZED.get().is_some() {
        if let Some(counter) = CACHE_HITS.get() {
            counter.inc();
        }
    }
}

pub fn record_cache_miss() {
    // Check if metrics are initialized before recording
    if METRICS_INITIALIZED.get().is_some() {
        if let Some(counter) = CACHE_MISSES.get() {
            counter.inc();
        }
    }
}

pub fn increment_total_connections() {
    // Check if metrics are initialized before recording
    if METRICS_INITIALIZED.get().is_some() {
        if let Some(counter) = TOTAL_CONNECTIONS.get() {
            counter.inc();
        }
    }
}

pub fn update_system_metrics() {
    // Update all metrics only if metrics are initialized
    if METRICS_INITIALIZED.get().is_some() {
        let mut sys = System::new_all();
        sys.refresh_all();

        let current_pid = std::process::id();
        let process = sys.processes().get(&(current_pid as usize).into());

        let cpu_usage = process.map(|p| p.cpu_usage()).unwrap_or(0.0);
        let memory_usage = process.map(|p| p.memory()).unwrap_or(0);
        let server_uptime = SERVER_START_TIME
            .get()
            .map(|start| start.elapsed().as_secs())
            .unwrap_or(0);

        let subprocesses = sys
            .processes()
            .values()
            .filter(|p| {
                p.parent()
                    .map(|ppid| ppid.as_u32() == current_pid)
                    .unwrap_or(false)
            })
            .collect::<Vec<_>>();

        let subprocess_count = subprocesses.len();
        let total_subprocess_memory: u64 = subprocesses.iter().map(|p| p.memory()).sum();
        let total_subprocess_cpu: f32 = subprocesses.iter().map(|p| p.cpu_usage()).sum();

        let total_processes = sys.processes().len();
        let total_system_memory = sys.total_memory();
        let used_system_memory = sys.used_memory();

        if let Some(gauge) = PROCESS_CPU_USAGE.get() {
            gauge.set(cpu_usage as i64);
        }
        if let Some(gauge) = PROCESS_MEMORY_USAGE.get() {
            gauge.set(memory_usage as i64);
        }
        if let Some(gauge) = PROCESS_UPTIME.get() {
            gauge.set(server_uptime as i64);
        }
        if let Some(gauge) = SUBPROCESS_COUNT.get() {
            gauge.set(subprocess_count as i64);
        }
        if let Some(gauge) = SUBPROCESS_MEMORY.get() {
            gauge.set(total_subprocess_memory as i64);
        }
        if let Some(gauge) = SUBPROCESS_CPU.get() {
            gauge.set(total_subprocess_cpu as i64);
        }
        if let Some(gauge) = SYSTEM_PROCESSES.get() {
            gauge.set(total_processes as i64);
        }
        if let Some(gauge) = SYSTEM_MEMORY_USED.get() {
            gauge.set((used_system_memory / 1024 / 1024) as i64);
        }
        if let Some(gauge) = SYSTEM_MEMORY_TOTAL.get() {
            gauge.set((total_system_memory / 1024 / 1024) as i64);
        }
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
    increment_total_connections();

    // Increment pending requests counter
    update_pending_requests(1);

    let response = next.run(req).await;

    let latency = start.elapsed().as_secs_f64();
    let status = response.status().as_u16().to_string();

    // Decrement pending requests counter
    update_pending_requests(-1);

    // Update Prometheus metrics
    record_http_request(&method.to_string(), &path, &status, latency);

    response
}
