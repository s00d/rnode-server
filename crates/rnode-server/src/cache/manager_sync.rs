use std::sync::Arc;
use crate::cache::types::*;
use crate::cache::memory_sync::InMemoryCacheSync;
use crate::cache::redis_sync::RedisCacheSync;
use crate::cache::file_sync::FileCacheSync;
use log::{debug, info};

pub struct CacheManagerSync {
    memory_cache: Arc<InMemoryCacheSync>,
    redis_cache: Option<Arc<RedisCacheSync>>,
    file_cache: Option<Arc<FileCacheSync>>,
}

impl CacheManagerSync {
    fn get_tags_option(&self, options: &CacheOptions) -> Option<Vec<String>> {
        if options.tags.is_empty() {
            None
        } else {
            Some(options.tags.clone())
        }
    }
    
    pub fn new(config: CacheConfig) -> CacheResult<Self> {
        info!("🚀 Initializing multi-level cache system");
        
        // Инициализируем L1 (memory cache)
        let memory_cache = Arc::new(InMemoryCacheSync::new());
        
        // Инициализируем L2 (Redis cache) если указан URL
        let redis_cache = if let Some(redis_url) = config.redis_url {
            match RedisCacheSync::new(&redis_url, None) {
                Ok(cache) => {
                    info!("✅ Redis cache initialized");
                    Some(Arc::new(cache))
                }
                Err(e) => {
                    info!("⚠️ Failed to initialize Redis cache: {}", e);
                    None
                }
            }
        } else {
            None
        };
        
        // Инициализируем L3 (file cache)
        let file_cache = match FileCacheSync::new(&config.file_cache_path) {
            Ok(cache) => {
                info!("✅ File cache initialized");
                Some(Arc::new(cache))
            }
            Err(e) => {
                info!("⚠️ Failed to initialize file cache: {}", e);
                None
            }
        };
        
        Ok(Self {
            memory_cache,
            redis_cache,
            file_cache,
        })
    }
    
    pub fn get<T>(&self, key: &str, options: &CacheOptions) -> CacheResult<Option<T>>
    where
        T: for<'de> serde::Deserialize<'de>,
    {
        debug!("🔍 Getting from cache: {}", key);
        
        // Проверяем L1 (memory cache)
        match self.memory_cache.get(key, self.get_tags_option(options))? {
            Some(item) => {
                debug!("✅ L1 cache hit: {}", key);
                let value = serde_json::from_str(&item.value)
                    .map_err(|e| CacheError::DeserializationError(format!("Failed to deserialize: {}", e)))?;
                Ok(Some(value))
            }
            None => {
                debug!("❌ L1 cache miss: {}", key);
                
                // Проверяем L2 (Redis cache)
                if let Some(ref redis_cache) = self.redis_cache {
                    match redis_cache.get(key, self.get_tags_option(options))? {
                        Some(item) => {
                            debug!("✅ L2 cache hit: {}", key);
                            let value = serde_json::from_str(&item.value)
                                .map_err(|e| CacheError::DeserializationError(format!("Failed to deserialize: {}", e)))?;
                            
                            // Копируем в L1
                            if let Err(e) = self.memory_cache.set(key.to_string(), item.value, options) {
                                debug!("⚠️ Failed to copy to L1 cache: {}", e);
                            }
                            
                            Ok(Some(value))
                        }
                        None => {
                            debug!("❌ L2 cache miss: {}", key);
                            
                            // Проверяем L3 (file cache)
                            if let Some(ref file_cache) = self.file_cache {
                                match file_cache.get(key, self.get_tags_option(options))? {
                                    Some(item) => {
                                        debug!("✅ L3 cache hit: {}", key);
                                        let value = serde_json::from_str(&item.value)
                                            .map_err(|e| CacheError::DeserializationError(format!("Failed to deserialize: {}", e)))?;
                                        
                                        // Копируем в L1 и L2
                                        if let Err(e) = self.memory_cache.set(key.to_string(), item.value.clone(), options) {
                                            debug!("⚠️ Failed to copy to L1 cache: {}", e);
                                        }
                                        if let Some(ref redis_cache) = self.redis_cache {
                                            if let Err(e) = redis_cache.set(key, item.value, options) {
                                                debug!("⚠️ Failed to copy to L2 cache: {}", e);
                                            }
                                        }
                                        
                                        Ok(Some(value))
                                    }
                                    None => {
                                        debug!("❌ L3 cache miss: {}", key);
                                        Ok(None)
                                    }
                                }
                            } else {
                                Ok(None)
                            }
                        }
                    }
                } else {
                                                // Проверяем L3 (file cache) если Redis недоступен
                            if let Some(ref file_cache) = self.file_cache {
                                match file_cache.get(key, self.get_tags_option(options))? {
                            Some(item) => {
                                debug!("✅ L3 cache hit: {}", key);
                                let value = serde_json::from_str(&item.value)
                                    .map_err(|e| CacheError::DeserializationError(format!("Failed to deserialize: {}", e)))?;
                                
                                // Копируем в L1
                                if let Err(e) = self.memory_cache.set(key.to_string(), item.value, options) {
                                    debug!("⚠️ Failed to copy to L1 cache: {}", e);
                                }
                                
                                Ok(Some(value))
                            }
                            None => {
                                debug!("❌ L3 cache miss: {}", key);
                                Ok(None)
                            }
                        }
                    } else {
                        Ok(None)
                    }
                }
            }
        }
    }
    
    pub fn set<T>(&self, key: &str, value: T, options: &CacheOptions) -> CacheResult<()>
    where
        T: serde::Serialize,
    {
        debug!("💾 Setting cache: {}", key);
        
        let value_str = serde_json::to_string(&value)
            .map_err(|e| CacheError::SerializationError(format!("Failed to serialize: {}", e)))?;
        
        // Сохраняем во все уровни
        self.memory_cache.set(key.to_string(), value_str.clone(), options)?;
        
        if let Some(ref redis_cache) = self.redis_cache {
            if let Err(e) = redis_cache.set(key, value_str.clone(), options) {
                debug!("⚠️ Failed to set in Redis: {}", e);
            }
        }
        
        if let Some(ref file_cache) = self.file_cache {
            if let Err(e) = file_cache.set(key, value_str, options) {
                debug!("⚠️ Failed to set in file cache: {}", e);
            }
        }
        
        Ok(())
    }
    
    pub fn delete(&self, key: &str, options: &CacheOptions) -> CacheResult<bool> {
        debug!("🗑️ Deleting cache: {}", key);
        
        let mut deleted = false;
        
        // Удаляем из всех уровней
        if self.memory_cache.delete(key, self.get_tags_option(options))? {
            deleted = true;
        }
        
        if let Some(ref redis_cache) = self.redis_cache {
            if redis_cache.delete(key, self.get_tags_option(options))? {
                deleted = true;
            }
        }
        
        if let Some(ref file_cache) = self.file_cache {
            if file_cache.delete(key, self.get_tags_option(options))? {
                deleted = true;
            }
        }
        
        Ok(deleted)
    }
    
    pub fn exists(&self, key: &str, options: &CacheOptions) -> CacheResult<bool> {
        debug!("🔍 Checking cache existence: {}", key);
        
        // Проверяем во всех уровнях
        if self.memory_cache.exists(key, self.get_tags_option(options))? {
            return Ok(true);
        }
        
        if let Some(ref redis_cache) = self.redis_cache {
            if redis_cache.exists(key, self.get_tags_option(options))? {
                return Ok(true);
            }
        }
        
        if let Some(ref file_cache) = self.file_cache {
            if file_cache.exists(key, self.get_tags_option(options))? {
                return Ok(true);
            }
        }
        
        Ok(false)
    }
    
    pub fn flush_by_tags(&self, tags: &[String]) -> CacheResult<usize> {
        debug!("🏷️ Flushing by tags: {:?}", tags);
        
        let mut total_count = 0;
        
        // Flush во всех уровнях
        if let Ok(count) = self.memory_cache.flush_by_tags(tags) {
            total_count += count;
        }
        
        if let Some(ref redis_cache) = self.redis_cache {
            if let Ok(count) = redis_cache.flush_by_tags(tags) {
                total_count += count;
            }
        }
        
        if let Some(ref file_cache) = self.file_cache {
            if let Ok(count) = file_cache.flush_by_tags(tags) {
                total_count += count;
            }
        }
        
        debug!("🏷️ Flushed {} items by tags", total_count);
        Ok(total_count)
    }
    
    pub fn clear(&self) -> CacheResult<()> {
        debug!("🗑️ Clearing all caches");
        
        self.memory_cache.clear()?;
        
        if let Some(ref redis_cache) = self.redis_cache {
            if let Err(e) = redis_cache.clear() {
                debug!("⚠️ Failed to clear Redis: {}", e);
            }
        }
        
        if let Some(ref file_cache) = self.file_cache {
            if let Err(e) = file_cache.clear() {
                debug!("⚠️ Failed to clear file cache: {}", e);
            }
        }
        
        Ok(())
    }
}
