use neon::prelude::*;
use serde_json;
use std::sync::{Arc, Mutex, Condvar, OnceLock};
use std::collections::HashMap;
use std::time::{Duration, Instant};

/// Structure for storing promise status
#[derive(Debug, Clone)]
pub enum PromiseStatus {
    Pending,
    Completed(serde_json::Value),
    Failed(String),
}

/// Structure for storing promise information
#[derive(Debug)]
pub struct PromiseInfo {
    pub status: PromiseStatus,
    pub timeout: Duration,
}

/// Global promise storage
pub struct PromiseStore {
    promises: Arc<Mutex<HashMap<String, PromiseInfo>>>,
    condition: Arc<Condvar>,
}

impl PromiseStore {
    pub fn new() -> Self {
        Self {
            promises: Arc::new(Mutex::new(HashMap::new())),
            condition: Arc::new(Condvar::new()),
        }
    }

    /// Create a new promise
    pub fn create_promise(&self, promise_id: &str, timeout_ms: u64) {
        let mut promises = self.promises.lock().unwrap();
        promises.insert(
            promise_id.to_string(),
            PromiseInfo {
                status: PromiseStatus::Pending,
                timeout: Duration::from_millis(timeout_ms),
            },
        );
        // Notify all waiting threads
        self.condition.notify_all();
    }

    /// Set promise result (called from JavaScript)
    pub fn set_promise_result(&self, promise_id: &str, result: serde_json::Value) -> bool {
        let mut promises = self.promises.lock().unwrap();
        if let Some(promise_info) = promises.get_mut(promise_id) {
            promise_info.status = PromiseStatus::Completed(result);
            // Notify all waiting threads
            self.condition.notify_all();
            true
        } else {
            false
        }
    }

    /// Set promise error (called from JavaScript)
    pub fn set_promise_error(&self, promise_id: &str, error: String) -> bool {
        let mut promises = self.promises.lock().unwrap();
        if let Some(promise_info) = promises.get_mut(promise_id) {
            promise_info.status = PromiseStatus::Failed(error);
            // Notify all waiting threads
            self.condition.notify_all();
            true
        } else {
            false
        }
    }



    /// Wait for promise completion with timeout
    pub fn wait_for_promise(&self, promise_id: &str) -> Result<serde_json::Value, String> {
        let start_time = Instant::now();
        
        loop {
            let mut promises = self.promises.lock().unwrap();
            
            // Check current status
            if let Some(promise_info) = promises.get(promise_id) {
                match &promise_info.status {
                    PromiseStatus::Completed(result) => {
                        let result_clone = result.clone();
                        promises.remove(promise_id);
                        return Ok(result_clone);
                    }
                    PromiseStatus::Failed(error) => {
                        let error_clone = error.clone();
                        promises.remove(promise_id);
                        return Err(error_clone);
                    }
                    PromiseStatus::Pending => {
                        println!("wait_for_promise: promise completed after {:?} >= {:?}", start_time.elapsed(), promise_info.timeout);
                        if start_time.elapsed() >= promise_info.timeout {
                            let timeout_ms = promise_info.timeout.as_millis();
                            promises.remove(promise_id);
                            return Err(format!("Request timeout after {}ms", timeout_ms));
                        }
                        
                        // Wait for status change with timeout
                        let remaining_timeout = promise_info.timeout - start_time.elapsed();
                        let (mut promises, _) = self.condition
                            .wait_timeout(promises, remaining_timeout)
                            .unwrap();
                        
                        // Check status again after waiting
                        if let Some(promise_info) = promises.get(promise_id) {
                            match &promise_info.status {
                                PromiseStatus::Completed(result) => {
                                    let result_clone = result.clone();
                                    promises.remove(promise_id);
                                    return Ok(result_clone);
                                }
                                PromiseStatus::Failed(error) => {
                                    let error_clone = error.clone();
                                    promises.remove(promise_id);
                                    return Err(error_clone);
                                }
                                PromiseStatus::Pending => {
                                    // Continue waiting
                                    continue;
                                }
                            }
                        }
                    }
                }
            } else {
                return Err("Promise not found or already completed".to_string());
            }
        }
    }


}

// Global instance of promise storage
static PROMISE_STORE: OnceLock<PromiseStore> = OnceLock::new();

fn get_promise_store() -> &'static PromiseStore {
    PROMISE_STORE.get_or_init(|| PromiseStore::new())
}

/// Function for waiting for promise completion
pub async fn wait_for_promise_completion(
    promise_id: &str,
    timeout: u64, // Timeout in milliseconds
) -> Result<serde_json::Value, String> {
    // Create promise in storage
    get_promise_store().create_promise(promise_id, timeout);
    
    // Wait for completion
    match get_promise_store().wait_for_promise(promise_id) {
        Ok(result) => Ok(result),
        Err(error) => {
            if error.contains("Request timeout") {
                Err(format!("Request timed out after {}ms", timeout))
            } else {
                Err(error)
            }
        }
    }
}



/// Function for setting promise result (called from JavaScript)
pub fn set_promise_result(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let promise_id = cx.argument::<JsString>(0)?.value(&mut cx);
    let result_json = cx.argument::<JsString>(1)?.value(&mut cx);
    
    let result: serde_json::Value = serde_json::from_str(&result_json)
        .unwrap_or_else(|_| serde_json::json!({}));
    
    let success = get_promise_store().set_promise_result(&promise_id, result);
    Ok(cx.boolean(success))
}

/// Function for setting promise error (called from JavaScript)
pub fn set_promise_error(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let promise_id = cx.argument::<JsString>(0)?.value(&mut cx);
    let error = cx.argument::<JsString>(1)?.value(&mut cx);
    
    let success = get_promise_store().set_promise_error(&promise_id, error);
    Ok(cx.boolean(success))
}


