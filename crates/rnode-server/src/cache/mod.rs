pub mod types;
pub mod memory_sync;
pub mod redis_sync;
pub mod file_sync;
pub mod manager_sync;
pub mod neon_wrappers;

use std::sync::OnceLock;
use std::time::Instant;
use crate::cache::types::*;
use crate::cache::manager_sync::CacheManagerSync;
use crate::metrics;
use log::{debug, info};

static CACHE_MANAGER: OnceLock<CacheManagerSync> = OnceLock::new();

pub fn init_cache_system(config: CacheConfig) -> CacheResult<()> {
    info!("🚀 Initializing cache system");
    
    let manager = CacheManagerSync::new(config)?;
    
    CACHE_MANAGER.set(manager)
        .map_err(|_| CacheError::RedisError("Cache system already initialized".to_string()))?;
    
    info!("✅ Cache system initialized successfully");
    Ok(())
}

pub fn get_cache_manager() -> Option<&'static CacheManagerSync> {
    CACHE_MANAGER.get()
}

pub fn cache_get<T>(key: &str, options: &CacheOptions) -> CacheResult<Option<T>>
where
    T: for<'de> serde::Deserialize<'de>,
{
    let start_time = Instant::now();
    debug!("🔍 Cache get called for key: {}", key);
    
    if let Some(cache_manager) = get_cache_manager() {
        debug!("✅ Cache manager found");
        let result = cache_manager.get(key, options);
        
        let duration = start_time.elapsed().as_secs_f64();
        let key_pattern = metrics::cache::get_key_pattern(key);
        
        match &result {
            Ok(Some(_)) => { 
                debug!("✅ Cache get hit: {}", key);
                metrics::record_cache_hit_with_tags_metric("memory", &key_pattern, &options.tags);
                metrics::record_cache_operation_with_tags_metric("get", "memory", "hit", &options.tags);
            }
            Ok(None) => { 
                debug!("❌ Cache get miss: {}", key);
                metrics::record_cache_miss_with_tags_metric("memory", &key_pattern, &options.tags);
                metrics::record_cache_operation_with_tags_metric("get", "memory", "miss", &options.tags);
            }
            Err(e) => { 
                debug!("❌ Cache get error: {}", e);
                metrics::record_cache_error_metric("get_error", "memory", "get");
                metrics::record_cache_operation_with_tags_metric("get", "memory", "error", &options.tags);
            }
        }
        
        metrics::record_cache_operation_duration_metric("get", "memory", duration);
        result
    } else {
        debug!("❌ Cache manager not found");
        metrics::record_cache_error_metric("not_initialized", "memory", "get");
        Err(CacheError::RedisError("Cache system not initialized".to_string()))
    }
}

pub fn cache_set<T>(key: &str, value: T, options: &CacheOptions) -> CacheResult<()>
where
    T: serde::Serialize,
{
    let start_time = Instant::now();
    debug!("💾 Cache set called for key: {}", key);
    
    if let Some(cache_manager) = get_cache_manager() {
        debug!("✅ Cache manager found");
        let result = cache_manager.set(key, value, options);
        
        let duration = start_time.elapsed().as_secs_f64();
        
        match &result {
            Ok(_) => { 
                debug!("✅ Cache set success: {}", key);
                metrics::record_cache_operation_with_tags_metric("set", "memory", "success", &options.tags);
            }
            Err(e) => { 
                debug!("❌ Cache set error: {}", e);
                metrics::record_cache_error_metric("set_error", "memory", "set");
                metrics::record_cache_operation_with_tags_metric("set", "memory", "error", &options.tags);
            }
        }
        
        metrics::record_cache_operation_duration_metric("set", "memory", duration);
        result
    } else {
        debug!("❌ Cache manager not found");
        metrics::record_cache_error_metric("not_initialized", "memory", "set");
        Err(CacheError::RedisError("Cache system not initialized".to_string()))
    }
}

pub fn cache_delete(key: &str, options: &CacheOptions) -> CacheResult<bool> {
    let start_time = Instant::now();
    debug!("🗑️ Cache delete called for key: {}", key);
    
    if let Some(cache_manager) = get_cache_manager() {
        debug!("✅ Cache manager found");
        let result = cache_manager.delete(key, options);
        
        let duration = start_time.elapsed().as_secs_f64();
        
        match &result {
            Ok(true) => { 
                debug!("✅ Cache delete success: {}", key);
                metrics::record_cache_operation_with_tags_metric("delete", "memory", "success", &options.tags);
            }
            Ok(false) => { 
                debug!("❌ Cache delete not found: {}", key);
                metrics::record_cache_operation_with_tags_metric("delete", "memory", "not_found", &options.tags);
            }
            Err(e) => { 
                debug!("❌ Cache delete error: {}", e);
                metrics::record_cache_error_metric("delete_error", "memory", "delete");
                metrics::record_cache_operation_with_tags_metric("delete", "memory", "error", &options.tags);
            }
        }
        
        metrics::record_cache_operation_duration_metric("delete", "memory", duration);
        result
    } else {
        debug!("❌ Cache manager not found");
        metrics::record_cache_error_metric("not_initialized", "memory", "delete");
        Err(CacheError::RedisError("Cache system not initialized".to_string()))
    }
}

pub fn cache_exists(key: &str, options: &CacheOptions) -> CacheResult<bool> {
    debug!("🔍 Cache exists called for key: {}", key);
    if let Some(cache_manager) = get_cache_manager() {
        debug!("✅ Cache manager found");
        let result = cache_manager.exists(key, options);
        match &result {
            Ok(true) => { debug!("✅ Cache exists: {}", key); }
            Ok(false) => { debug!("❌ Cache not exists: {}", key); }
            Err(e) => { debug!("❌ Cache exists error: {}", e); }
        }
        result
    } else {
        debug!("❌ Cache manager not found");
        Err(CacheError::RedisError("Cache system not initialized".to_string()))
    }
}

pub fn cache_clear() -> CacheResult<()> {
    let start_time = Instant::now();
    debug!("🗑️ Cache clear called");
    
    if let Some(cache_manager) = get_cache_manager() {
        debug!("✅ Cache manager found");
        let result = cache_manager.clear();
        
        let duration = start_time.elapsed().as_secs_f64();
        
        match &result {
            Ok(_) => { 
                debug!("✅ Cache clear success");
                metrics::record_cache_operation_metric("clear", "memory", "success");
            }
            Err(e) => { 
                debug!("❌ Cache clear error: {}", e);
                metrics::record_cache_error_metric("clear_error", "memory", "clear");
                metrics::record_cache_operation_metric("clear", "memory", "error");
            }
        }
        
        metrics::record_cache_operation_duration_metric("clear", "memory", duration);
        result
    } else {
        debug!("❌ Cache manager not found");
        metrics::record_cache_error_metric("not_initialized", "memory", "clear");
        Err(CacheError::RedisError("Cache system not initialized".to_string()))
    }
}

pub fn cache_flush_by_tags(tags: &[String]) -> CacheResult<usize> {
    let start_time = Instant::now();
    debug!("🏷️ Cache flush by tags called: {:?}", tags);
    
    if let Some(cache_manager) = get_cache_manager() {
        debug!("✅ Cache manager found");
        let result = cache_manager.flush_by_tags(tags);
        
        let duration = start_time.elapsed().as_secs_f64();
        
        match &result {
            Ok(count) => { 
                debug!("✅ Cache flush by tags success: {} items", count);
                metrics::record_tag_operation_metric("flush", "memory");
                metrics::record_cache_operation_metric("flush_by_tags", "memory", "success");
            }
            Err(e) => { 
                debug!("❌ Cache flush by tags error: {}", e);
                metrics::record_cache_error_metric("flush_error", "memory", "flush_by_tags");
                metrics::record_cache_operation_metric("flush_by_tags", "memory", "error");
            }
        }
        
        metrics::record_cache_operation_duration_metric("flush_by_tags", "memory", duration);
        result
    } else {
        debug!("❌ Cache manager not found");
        metrics::record_cache_error_metric("not_initialized", "memory", "flush_by_tags");
        Err(CacheError::RedisError("Cache system not initialized".to_string()))
    }
}