pub mod types;
pub mod memory_sync;
pub mod redis_sync;
pub mod file_sync;
pub mod manager_sync;
pub mod neon;

use std::sync::OnceLock;
use crate::cache::types::*;
use crate::cache::manager_sync::CacheManagerSync;
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
    debug!("🔍 Cache get called for key: {}", key);
    if let Some(cache_manager) = get_cache_manager() {
        debug!("✅ Cache manager found");
        let result = cache_manager.get(key, options);
        match &result {
            Ok(Some(_)) => { debug!("✅ Cache get hit: {}", key); }
            Ok(None) => { debug!("❌ Cache get miss: {}", key); }
            Err(e) => { debug!("❌ Cache get error: {}", e); }
        }
        result
    } else {
        debug!("❌ Cache manager not found");
        Err(CacheError::RedisError("Cache system not initialized".to_string()))
    }
}

pub fn cache_set<T>(key: &str, value: T, options: &CacheOptions) -> CacheResult<()>
where
    T: serde::Serialize,
{
    debug!("💾 Cache set called for key: {}", key);
    if let Some(cache_manager) = get_cache_manager() {
        debug!("✅ Cache manager found");
        let result = cache_manager.set(key, value, options);
        match &result {
            Ok(_) => { debug!("✅ Cache set success: {}", key); }
            Err(e) => { debug!("❌ Cache set error: {}", e); }
        }
        result
    } else {
        debug!("❌ Cache manager not found");
        Err(CacheError::RedisError("Cache system not initialized".to_string()))
    }
}

pub fn cache_delete(key: &str, options: &CacheOptions) -> CacheResult<bool> {
    debug!("🗑️ Cache delete called for key: {}", key);
    if let Some(cache_manager) = get_cache_manager() {
        debug!("✅ Cache manager found");
        let result = cache_manager.delete(key, options);
        match &result {
            Ok(true) => { debug!("✅ Cache delete success: {}", key); }
            Ok(false) => { debug!("❌ Cache delete not found: {}", key); }
            Err(e) => { debug!("❌ Cache delete error: {}", e); }
        }
        result
    } else {
        debug!("❌ Cache manager not found");
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
    debug!("🗑️ Cache clear called");
    if let Some(cache_manager) = get_cache_manager() {
        debug!("✅ Cache manager found");
        let result = cache_manager.clear();
        match &result {
            Ok(_) => { debug!("✅ Cache clear success"); }
            Err(e) => { debug!("❌ Cache clear error: {}", e); }
        }
        result
    } else {
        debug!("❌ Cache manager not found");
        Err(CacheError::RedisError("Cache system not initialized".to_string()))
    }
}

pub fn cache_flush_by_tags(tags: &[String]) -> CacheResult<usize> {
    debug!("🏷️ Cache flush by tags called: {:?}", tags);
    if let Some(cache_manager) = get_cache_manager() {
        debug!("✅ Cache manager found");
        let result = cache_manager.flush_by_tags(tags);
        match &result {
            Ok(count) => { debug!("✅ Cache flush by tags success: {} items", count); }
            Err(e) => { debug!("❌ Cache flush by tags error: {}", e); }
        }
        result
    } else {
        debug!("❌ Cache manager not found");
        Err(CacheError::RedisError("Cache system not initialized".to_string()))
    }
}