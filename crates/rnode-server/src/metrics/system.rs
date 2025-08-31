use prometheus::{IntGauge, opts, register_int_gauge};
use std::sync::OnceLock;
use std::time::Instant;
use sysinfo::System;

// Static system metrics using OnceLock
static PROCESS_CPU_USAGE: OnceLock<IntGauge> = OnceLock::new();
static PROCESS_MEMORY_USAGE: OnceLock<IntGauge> = OnceLock::new();
static PROCESS_UPTIME: OnceLock<IntGauge> = OnceLock::new();
static SUBPROCESS_COUNT: OnceLock<IntGauge> = OnceLock::new();
static SUBPROCESS_MEMORY: OnceLock<IntGauge> = OnceLock::new();
static SUBPROCESS_CPU: OnceLock<IntGauge> = OnceLock::new();
static SYSTEM_PROCESSES: OnceLock<IntGauge> = OnceLock::new();
static SYSTEM_MEMORY_USED: OnceLock<IntGauge> = OnceLock::new();
static SYSTEM_MEMORY_TOTAL: OnceLock<IntGauge> = OnceLock::new();

// Server start time for uptime calculation
static SERVER_START_TIME: OnceLock<Instant> = OnceLock::new();

pub fn init_system_metrics() {
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

    // Set server start time
    SERVER_START_TIME.set(Instant::now()).ok();
}

pub fn update_system_metrics() {
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
