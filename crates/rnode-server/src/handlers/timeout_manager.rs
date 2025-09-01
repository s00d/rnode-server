use log::{debug, warn};
use std::time::Instant;

// Утилиты для работы с таймаутами
pub struct TimeoutManager {
    pub start_time: Instant,
    total_timeout: u64,
}

impl TimeoutManager {
    pub fn new(timeout: u64) -> Self {
        Self {
            start_time: Instant::now(),
            total_timeout: timeout,
        }
    }

    pub fn get_remaining_time(&self) -> u64 {
        let elapsed = self.start_time.elapsed().as_millis() as u64;
        if elapsed >= self.total_timeout {
            0
        } else {
            self.total_timeout - elapsed
        }
    }

    pub fn is_expired(&self) -> bool {
        self.get_remaining_time() == 0
    }

    pub fn get_total_timeout(&self) -> u64 {
        self.total_timeout
    }

    pub fn get_elapsed_time(&self) -> u64 {
        self.start_time.elapsed().as_millis() as u64
    }

    pub fn log_timeout_status(&self, context: &str) {
        let elapsed = self.start_time.elapsed().as_millis() as u64;
        let remaining = self.get_remaining_time();
        debug!("⏱️ {} - Elapsed: {}ms, Remaining: {}ms", context, elapsed, remaining);
        
        if remaining == 0 {
            warn!("⏰ {} timeout exceeded: {}ms elapsed, {}ms limit", context, elapsed, self.total_timeout);
        }
    }
}
