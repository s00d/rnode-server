use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use chrono::{Utc};
use crate::cache::types::*;
use log::{debug};

pub struct InMemoryCacheSync {
    store: Arc<Mutex<HashMap<String, CacheItem<String>>>>,
}

impl InMemoryCacheSync {
    pub fn new() -> Self {
        Self {
            store: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn get(&self, key: &str, tags: Option<Vec<String>>) -> CacheResult<Option<CacheItem<String>>> {
        debug!("🔍 Memory cache get: {}", key);
        
        let store = self.store.lock().unwrap();
        
        if let Some(item) = store.get(key) {
            // Проверка срока действия
            if let Some(expires_at) = item.expires_at {
                if Utc::now() > expires_at {
                    debug!("🗑️ Cache item expired: {}", key);
                    drop(store);
                    self.delete(key, None)?;
                    return Ok(None);
                }
            }
            
            // Проверяем теги если указаны
            if let Some(requested_tags) = tags {
                if !requested_tags.iter().all(|tag| item.tags.contains(tag)) {
                    debug!("🏷️ Tags mismatch for key: {}", key);
                    return Ok(None);
                }
            }
            
            debug!("✅ Memory cache hit: {}", key);
            Ok(Some(item.clone()))
        } else {
            debug!("❌ Memory cache miss: {}", key);
            Ok(None)
        }
    }
    
    pub fn set(&self, key: String, value: String, options: &CacheOptions) -> CacheResult<()> {
        let expires_at = options.ttl.map(|seconds| Utc::now() + chrono::Duration::seconds(seconds as i64));
        
        let item = CacheItem {
            value,
            created_at: Utc::now(),
            expires_at,
            tags: options.tags.clone(),
        };
        
        let mut store = self.store.lock().unwrap();
        store.insert(key.clone(), item);
        
        debug!("💾 Memory cache set: {}", key);
        Ok(())
    }
    
    pub fn delete(&self, key: &str, tags: Option<Vec<String>>) -> CacheResult<bool> {
        let mut store = self.store.lock().unwrap();
        
        if let Some(item) = store.get(key) {
            // Проверяем теги если указаны
            if let Some(requested_tags) = tags {
                if !requested_tags.iter().all(|tag| item.tags.contains(tag)) {
                    debug!("🏷️ Tags mismatch for delete: {}", key);
                    return Ok(false);
                }
            }
            
            store.remove(key);
            debug!("🗑️ Memory cache delete: {}", key);
            Ok(true)
        } else {
            Ok(false)
        }
    }
    
    pub fn exists(&self, key: &str, tags: Option<Vec<String>>) -> CacheResult<bool> {
        let store = self.store.lock().unwrap();
        
        if let Some(item) = store.get(key) {
            // Проверяем теги если указаны
            if let Some(requested_tags) = tags {
                Ok(requested_tags.iter().all(|tag| item.tags.contains(tag)))
            } else {
                Ok(true)
            }
        } else {
            Ok(false)
        }
    }
    
    pub fn clear(&self) -> CacheResult<()> {
        let mut store = self.store.lock().unwrap();
        store.clear();
        debug!("🗑️ Memory cache cleared");
        Ok(())
    }
    
    pub fn flush_by_tags(&self, tags: &[String]) -> CacheResult<usize> {
        let mut store = self.store.lock().unwrap();
        let mut count = 0;
        
        let keys_to_remove: Vec<String> = store
            .iter()
            .filter(|(_, item)| {
                tags.iter().any(|tag| item.tags.contains(tag))
            })
            .map(|(key, _)| key.clone())
            .collect();
        
        for key in keys_to_remove {
            store.remove(&key);
            count += 1;
        }
        
        debug!("🏷️ Flushed {} items by tags: {:?}", count, tags);
        Ok(count)
    }
}
