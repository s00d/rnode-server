use prometheus::{IntCounter, IntCounterVec, IntGauge, IntGaugeVec, opts, register_int_counter, register_int_counter_vec, register_int_gauge, register_int_gauge_vec};
use std::sync::OnceLock;
use std::time::Instant;
use uuid::Uuid;

// Static WebSocket metrics using OnceLock
static WEBSOCKET_CONNECTIONS_TOTAL: OnceLock<IntCounter> = OnceLock::new();
static WEBSOCKET_DISCONNECTIONS_TOTAL: OnceLock<IntCounter> = OnceLock::new();
static WEBSOCKET_MESSAGES_SENT: OnceLock<IntCounterVec> = OnceLock::new();
static WEBSOCKET_MESSAGES_RECEIVED: OnceLock<IntCounterVec> = OnceLock::new();
static WEBSOCKET_CONNECTIONS_ACTIVE: OnceLock<IntGauge> = OnceLock::new();
static WEBSOCKET_ROOMS_TOTAL: OnceLock<IntGauge> = OnceLock::new();
static WEBSOCKET_ROOM_CONNECTIONS: OnceLock<IntGaugeVec> = OnceLock::new();
static WEBSOCKET_CONNECTION_DURATION: OnceLock<prometheus::HistogramVec> = OnceLock::new();
static WEBSOCKET_MESSAGE_SIZE: OnceLock<prometheus::HistogramVec> = OnceLock::new();
static WEBSOCKET_ERRORS: OnceLock<IntCounterVec> = OnceLock::new();


// Connection tracking
static CONNECTION_START_TIMES: OnceLock<std::sync::RwLock<std::collections::HashMap<Uuid, Instant>>> = OnceLock::new();

pub fn init_websocket_metrics() {
    WEBSOCKET_CONNECTIONS_TOTAL
        .set(
            register_int_counter!(opts!(
                "rnode_server_websocket_connections_total",
                "Total WebSocket connections since start"
            ))
            .expect("Can't create WebSocket connections total metric"),
        )
        .expect("WEBSOCKET_CONNECTIONS_TOTAL already initialized");

    WEBSOCKET_DISCONNECTIONS_TOTAL
        .set(
            register_int_counter!(opts!(
                "rnode_server_websocket_disconnections_total",
                "Total WebSocket disconnections since start"
            ))
            .expect("Can't create WebSocket disconnections total metric"),
        )
        .expect("WEBSOCKET_DISCONNECTIONS_TOTAL already initialized");

    WEBSOCKET_MESSAGES_SENT
        .set(
            register_int_counter_vec!(
                opts!("rnode_server_websocket_messages_sent_total", "Total WebSocket messages sent"),
                &["type", "room_id", "path"]
            )
            .expect("Can't create WebSocket messages sent metric"),
        )
        .expect("WEBSOCKET_MESSAGES_SENT already initialized");

    WEBSOCKET_MESSAGES_RECEIVED
        .set(
            register_int_counter_vec!(
                opts!("rnode_server_websocket_messages_received_total", "Total WebSocket messages received"),
                &["type", "room_id", "path"]
            )
            .expect("Can't create WebSocket messages received metric"),
        )
        .expect("WEBSOCKET_MESSAGES_RECEIVED already initialized");

    WEBSOCKET_CONNECTIONS_ACTIVE
        .set(
            register_int_gauge!(opts!(
                "rnode_server_websocket_connections_active",
                "Currently active WebSocket connections"
            ))
            .expect("Can't create WebSocket connections active metric"),
        )
        .expect("WEBSOCKET_CONNECTIONS_ACTIVE already initialized");

    WEBSOCKET_ROOMS_TOTAL
        .set(
            register_int_gauge!(opts!(
                "rnode_server_websocket_rooms_total",
                "Total number of WebSocket rooms"
            ))
            .expect("Can't create WebSocket rooms total metric"),
        )
        .expect("WEBSOCKET_ROOMS_TOTAL already initialized");

    WEBSOCKET_ROOM_CONNECTIONS
        .set(
            register_int_gauge_vec!(
                opts!("rnode_server_websocket_room_connections", "Number of connections in each room"),
                &["room_id", "room_name"]
            )
            .expect("Can't create WebSocket room connections metric"),
        )
        .expect("WEBSOCKET_ROOM_CONNECTIONS already initialized");

    WEBSOCKET_CONNECTION_DURATION
        .set(
            prometheus::register_histogram_vec!(
                "rnode_server_websocket_connection_duration_seconds",
                "WebSocket connection duration in seconds",
                &["path", "room_id"],
                vec![1.0, 5.0, 30.0, 60.0, 300.0, 600.0, 1800.0, 3600.0]
            )
            .expect("Can't create WebSocket connection duration metric"),
        )
        .expect("WEBSOCKET_CONNECTION_DURATION already initialized");

    WEBSOCKET_MESSAGE_SIZE
        .set(
            prometheus::register_histogram_vec!(
                "rnode_server_websocket_message_size_bytes",
                "WebSocket message size in bytes",
                &["type", "direction"],
                vec![10.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0]
            )
            .expect("Can't create WebSocket message size metric"),
        )
        .expect("WEBSOCKET_MESSAGE_SIZE already initialized");

    WEBSOCKET_ERRORS
        .set(
            register_int_counter_vec!(
                opts!("rnode_server_websocket_errors_total", "Total WebSocket errors"),
                &["error_type", "path", "room_id"]
            )
            .expect("Can't create WebSocket errors metric"),
        )
        .expect("WEBSOCKET_ERRORS already initialized");



    // Initialize connection tracking
    CONNECTION_START_TIMES
        .set(std::sync::RwLock::new(std::collections::HashMap::new()))
        .expect("CONNECTION_START_TIMES already initialized");
}

// Connection tracking functions
pub fn record_connection_start(connection_id: &Uuid, path: &str, room_id: Option<&str>) {
    if let Some(counter) = WEBSOCKET_CONNECTIONS_TOTAL.get() {
        counter.inc();
    }

    if let Some(gauge) = WEBSOCKET_CONNECTIONS_ACTIVE.get() {
        gauge.inc();
    }

    // Record connection start time
    if let Some(times) = CONNECTION_START_TIMES.get() {
        if let Ok(mut times) = times.write() {
            times.insert(*connection_id, Instant::now());
        }
    }

    // Record connection duration histogram
    if let Some(histogram) = WEBSOCKET_CONNECTION_DURATION.get() {
        let room_id_label = room_id.unwrap_or("none");
        histogram
            .with_label_values(&[path, room_id_label])
            .observe(0.0); // Start time
    }
}

pub fn record_connection_end(connection_id: &Uuid, path: &str, room_id: Option<&str>) {
    if let Some(counter) = WEBSOCKET_DISCONNECTIONS_TOTAL.get() {
        counter.inc();
    }

    if let Some(gauge) = WEBSOCKET_CONNECTIONS_ACTIVE.get() {
        gauge.dec();
    }

    // Calculate and record connection duration
    if let Some(times) = CONNECTION_START_TIMES.get() {
        if let Ok(mut times) = times.write() {
            if let Some(start_time) = times.remove(connection_id) {
                let duration = start_time.elapsed().as_secs_f64();
                
                if let Some(histogram) = WEBSOCKET_CONNECTION_DURATION.get() {
                    let room_id_label = room_id.unwrap_or("none");
                    histogram
                        .with_label_values(&[path, room_id_label])
                        .observe(duration);
                }
            }
        }
    }
}

// Message tracking functions
pub fn record_message_sent(message_type: &str, room_id: Option<&str>, path: &str, size: usize) {
    if let Some(counter) = WEBSOCKET_MESSAGES_SENT.get() {
        let room_id_label = room_id.unwrap_or("none");
        counter
            .with_label_values(&[message_type, room_id_label, path])
            .inc();
    }

    if let Some(histogram) = WEBSOCKET_MESSAGE_SIZE.get() {
        histogram
            .with_label_values(&[message_type, "sent"])
            .observe(size as f64);
    }
}

pub fn record_message_received(message_type: &str, room_id: Option<&str>, path: &str, size: usize) {
    if let Some(counter) = WEBSOCKET_MESSAGES_RECEIVED.get() {
        let room_id_label = room_id.unwrap_or("none");
        counter
            .with_label_values(&[message_type, room_id_label, path])
            .inc();
    }

    if let Some(histogram) = WEBSOCKET_MESSAGE_SIZE.get() {
        histogram
            .with_label_values(&[message_type, "received"])
            .observe(size as f64);
    }
}

// Room tracking functions
pub fn update_room_count(count: i64) {
    if let Some(gauge) = WEBSOCKET_ROOMS_TOTAL.get() {
        gauge.set(count);
    }
}

pub fn update_room_connections(room_id: &str, room_name: &str, count: i64) {
    if let Some(gauge) = WEBSOCKET_ROOM_CONNECTIONS.get() {
        gauge
            .with_label_values(&[room_id, room_name])
            .set(count);
    }
}

// Error tracking functions
pub fn record_error(error_type: &str, path: &str, room_id: Option<&str>) {
    if let Some(counter) = WEBSOCKET_ERRORS.get() {
        let room_id_label = room_id.unwrap_or("none");
        counter
            .with_label_values(&[error_type, path, room_id_label])
            .inc();
    }
}



// Update WebSocket metrics from current state
pub fn update_websocket_metrics() {
    // Check if WebSocket routes are registered
    let routes = crate::websocket::get_websocket_routes();
    if let Ok(routes) = routes.try_read() {
        if routes.is_empty() {
            // No WebSocket routes registered, skip metrics update
            return;
        }
    }

    // Update active connections count
    if let Some(gauge) = WEBSOCKET_CONNECTIONS_ACTIVE.get() {
        let connections = crate::websocket::rooms::get_websocket_connections();
        if let Ok(connections) = connections.try_read() {
            gauge.set(connections.len() as i64);
        }
    }

    // Update rooms count and room connections
    if let Some(gauge) = WEBSOCKET_ROOMS_TOTAL.get() {
        let rooms = crate::websocket::rooms::get_websocket_rooms();
        if let Ok(rooms) = rooms.try_read() {
            gauge.set(rooms.len() as i64);
        }
    }

    // Update room-specific connection counts
    if let Some(gauge) = WEBSOCKET_ROOM_CONNECTIONS.get() {
        let rooms = crate::websocket::rooms::get_websocket_rooms();
        if let Ok(rooms) = rooms.try_read() {
            for (room_id, room) in rooms.iter() {
                gauge
                    .with_label_values(&[room_id, &room.name])
                    .set(room.connections.len() as i64);
            }
        }
    }
}
