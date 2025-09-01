use std::sync::Arc;
use redis::{Client, Connection};
use crate::cache::types::*;
use log::{debug, info};
use chrono::{Utc};

pub struct RedisCacheSync {
    client: Arc<Client>,
    prefix: String,
}

impl RedisCacheSync {
    pub fn new(redis_url: &str, prefix: Option<String>) -> CacheResult<Self> {
        let client = Client::open(redis_url)
            .map_err(|e| CacheError::RedisError(format!("Failed to create Redis client: {}", e)))?;
        
        let prefix = prefix.unwrap_or_else(|| "rnode_cache:".to_string());
        
        info!("🔗 Redis cache initialized with prefix: {}", prefix);
        
        Ok(Self {
            client: Arc::new(client),
            prefix,
        })
    }
    
    pub fn get(&self, key: &str, tags: Option<Vec<String>>) -> CacheResult<Option<CacheItem<String>>> {
        let mut conn = self.get_connection()?;
        let full_key = self.get_full_key(key);
        
        let result: Option<String> = redis::cmd("GET")
            .arg(&full_key)
            .query(&mut conn)
            .map_err(|e| CacheError::RedisError(format!("Redis get error: {}", e)))?;
        
        match result {
            Some(data) => {
                // Десериализуем данные
                let item: CacheItem<String> = serde_json::from_str(&data)
                    .map_err(|e| CacheError::DeserializationError(format!("Failed to deserialize cache item: {}", e)))?;
                
                // Проверяем срок действия
                if let Some(expires_at) = item.expires_at {
                    if Utc::now() > expires_at {
                        debug!("🗑️ Redis cache item expired: {}", key);
                        self.delete(key, None)?;
                        return Ok(None);
                    }
                }
                
                // Проверяем теги если указаны
                if let Some(requested_tags) = tags {
                    if !requested_tags.iter().all(|tag| item.tags.contains(tag)) {
                        debug!("🏷️ Tags mismatch for Redis key: {}", key);
                        return Ok(None);
                    }
                }
                
                debug!("✅ Redis cache hit: {}", key);
                Ok(Some(item))
            }
            None => {
                debug!("❌ Redis cache miss: {}", key);
                Ok(None)
            }
        }
    }
    
    pub fn set(&self, key: &str, value: String, options: &CacheOptions) -> CacheResult<()> {
        let mut conn = self.get_connection()?;
        let full_key = self.get_full_key(key);
        
        let expires_at = options.ttl.map(|seconds| Utc::now() + chrono::Duration::seconds(seconds as i64));
        
        let item = CacheItem {
            value,
            created_at: Utc::now(),
            expires_at,
            tags: options.tags.clone(),
        };
        
        // Сериализуем для Redis
        let data = serde_json::to_string(&item)
            .map_err(|e| CacheError::SerializationError(format!("Failed to serialize cache item: {}", e)))?;
        
        // Сохраняем в Redis
        let mut cmd = redis::cmd("SET");
        cmd.arg(&full_key).arg(data);
        
        // Устанавливаем TTL если указан
        if let Some(ttl) = options.ttl {
            cmd.arg("EX").arg(ttl);
        }
        
        cmd.query::<()>(&mut conn)
            .map_err(|e| CacheError::RedisError(format!("Redis set error: {}", e)))?;
        
        // Сохраняем теги
        for tag in &options.tags {
            let tags_key = self.get_tags_key(tag);
            let _: () = redis::cmd("SADD")
                .arg(&tags_key)
                .arg(&full_key)
                .query(&mut conn)
                .map_err(|e| CacheError::RedisError(format!("Failed to add tag: {}", e)))?;
            
            // Устанавливаем TTL для тега
            if let Some(ttl) = options.ttl {
                let _: () = redis::cmd("EXPIRE")
                    .arg(&tags_key)
                    .arg(ttl)
                    .query(&mut conn)
                    .map_err(|e| CacheError::RedisError(format!("Failed to set tag TTL: {}", e)))?;
            }
        }
        
        debug!("💾 Redis cache set: {}", key);
        Ok(())
    }
    
    pub fn delete(&self, key: &str, tags: Option<Vec<String>>) -> CacheResult<bool> {
        let mut conn = self.get_connection()?;
        let full_key = self.get_full_key(key);
        
        // Проверяем теги если указаны
        if let Some(requested_tags) = tags {
            if let Some(data) = self.get(key, None)?.map(|item| item.value) {
                let item: CacheItem<String> = serde_json::from_str(&data)
                    .map_err(|e| CacheError::DeserializationError(format!("Failed to deserialize: {}", e)))?;
                
                if !requested_tags.iter().all(|tag| item.tags.contains(tag)) {
                    debug!("🏷️ Tags mismatch for Redis delete: {}", key);
                    return Ok(false);
                }
            }
        }
        
        let result: i32 = redis::cmd("DEL")
            .arg(&full_key)
            .query(&mut conn)
            .map_err(|e| CacheError::RedisError(format!("Redis delete error: {}", e)))?;
        
        let deleted = result > 0;
        if deleted {
            debug!("🗑️ Redis cache delete: {}", key);
        }
        
        Ok(deleted)
    }
    
    pub fn exists(&self, key: &str, tags: Option<Vec<String>>) -> CacheResult<bool> {
        let mut conn = self.get_connection()?;
        let full_key = self.get_full_key(key);
        
        let result: i32 = redis::cmd("EXISTS")
            .arg(&full_key)
            .query(&mut conn)
            .map_err(|e| CacheError::RedisError(format!("Redis exists error: {}", e)))?;
        
        let exists = result > 0;
        
        if exists {
            // Проверяем теги если указаны
            if let Some(requested_tags) = tags {
                if let Some(data) = self.get(key, None)?.map(|item| item.value) {
                    let item: CacheItem<String> = serde_json::from_str(&data)
                        .map_err(|e| CacheError::DeserializationError(format!("Failed to deserialize: {}", e)))?;
                    
                    return Ok(requested_tags.iter().all(|tag| item.tags.contains(tag)));
                }
            }
        }
        
        Ok(exists)
    }
    
    pub fn clear(&self) -> CacheResult<()> {
        let mut conn = self.get_connection()?;
        let pattern = format!("{}*", self.prefix);
        
        let keys: Vec<String> = redis::cmd("KEYS")
            .arg(&pattern)
            .query(&mut conn)
            .map_err(|e| CacheError::RedisError(format!("Redis keys error: {}", e)))?;
        
        if !keys.is_empty() {
            let _: i32 = redis::cmd("DEL")
                .arg(&keys)
                .query(&mut conn)
                .map_err(|e| CacheError::RedisError(format!("Redis clear error: {}", e)))?;
        }
        
        debug!("🗑️ Redis cache cleared");
        Ok(())
    }
    
    fn get_connection(&self) -> CacheResult<Connection> {
        self.client.get_connection()
            .map_err(|e| CacheError::RedisError(format!("Failed to get Redis connection: {}", e)))
    }
    
    fn get_full_key(&self, key: &str) -> String {
        format!("{}{}", self.prefix, key)
    }
    
    fn get_tags_key(&self, tag: &str) -> String {
        format!("{}:tags:{}", self.prefix, tag)
    }
    
    pub fn flush_by_tags(&self, tags: &[String]) -> CacheResult<usize> {
        let mut conn = self.get_connection()?;
        let mut count = 0;
        
        for tag in tags {
            let tags_key = self.get_tags_key(tag);
            let keys: Vec<String> = redis::cmd("SMEMBERS")
                .arg(&tags_key)
                .query(&mut conn)
                .map_err(|e| CacheError::RedisError(format!("Failed to get tag keys: {}", e)))?;
            
            if !keys.is_empty() {
                let _: () = redis::cmd("DEL")
                    .arg(&keys)
                    .query(&mut conn)
                    .map_err(|e| CacheError::RedisError(format!("Failed to delete tagged keys: {}", e)))?;
                
                // Удаляем тег
                let _: () = redis::cmd("DEL")
                    .arg(&tags_key)
                    .query(&mut conn)
                    .map_err(|e| CacheError::RedisError(format!("Failed to delete tag: {}", e)))?;
                
                count += keys.len();
            }
        }
        
        debug!("🏷️ Flushed {} items by tags in Redis", count);
        Ok(count)
    }
}
