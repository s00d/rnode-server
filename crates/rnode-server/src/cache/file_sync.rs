use std::collections::HashMap;
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write, BufWriter};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use crate::cache::types::*;
use log::{debug, info};
use chrono::{Utc};
use sha2::{Sha256, Digest};
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CacheIndexEntry {
    file_name: String,
    created_at: chrono::DateTime<Utc>,
    expires_at: Option<chrono::DateTime<Utc>>,
    tags: Vec<String>,
}

pub struct FileCacheSync {
    cache_dir: PathBuf,
    index_file: PathBuf,
    index: Arc<Mutex<HashMap<String, CacheIndexEntry>>>,
}

impl FileCacheSync {
    pub fn new(cache_dir: &str) -> CacheResult<Self> {
        let cache_dir = PathBuf::from(cache_dir);
        let index_file = cache_dir.join("index.json");
        
        // Создаем директорию если не существует
        fs::create_dir_all(&cache_dir)
            .map_err(|e| CacheError::FileError(format!("Failed to create cache directory: {}", e)))?;
        
        // Загружаем индекс
        let index = if index_file.exists() {
            let mut file = File::open(&index_file)
                .map_err(|e| CacheError::FileError(format!("Failed to open index file: {}", e)))?;
            
            let mut content = String::new();
            file.read_to_string(&mut content)
                .map_err(|e| CacheError::FileError(format!("Failed to read index file: {}", e)))?;
            
            serde_json::from_str(&content)
                .map_err(|e| CacheError::FileError(format!("Failed to parse index file: {}", e)))?
        } else {
            HashMap::new()
        };
        
        info!("📁 File cache initialized at: {}", cache_dir.display());
        
        Ok(Self {
            cache_dir,
            index_file,
            index: Arc::new(Mutex::new(index)),
        })
    }
    
    pub fn get(&self, key: &str, tags: Option<Vec<String>>) -> CacheResult<Option<CacheItem<String>>> {
        let index_guard = self.index.lock()
            .map_err(|e| CacheError::FileError(format!("Failed to read index: {}", e)))?;
        
        if let Some(entry) = index_guard.get(key) {
            // Проверяем срок действия
            if let Some(expires_at) = entry.expires_at {
                if Utc::now() > expires_at {
                    debug!("🗑️ File cache item expired: {}", key);
                    drop(index_guard);
                    self.delete(key, None)?;
                    return Ok(None);
                }
            }
            
            // Проверяем теги если указаны
            if let Some(requested_tags) = tags {
                if !requested_tags.iter().all(|tag| entry.tags.contains(tag)) {
                    debug!("🏷️ Tags mismatch for file key: {}", key);
                    return Ok(None);
                }
            }
            
            let file_path = self.cache_dir.join(&entry.file_name);
            
            if !file_path.exists() {
                debug!("❌ File cache file not found: {}", key);
                drop(index_guard);
                self.delete(key, None)?;
                return Ok(None);
            }
            
            // Читаем файл
            let mut file = File::open(&file_path)
                .map_err(|e| CacheError::FileError(format!("Failed to open cache file: {}", e)))?;
            
            let mut content = String::new();
            file.read_to_string(&mut content)
                .map_err(|e| CacheError::FileError(format!("Failed to read cache file: {}", e)))?;
            
            // Десериализуем данные
            let item: CacheItem<String> = serde_json::from_str(&content)
                .map_err(|e| CacheError::DeserializationError(format!("Failed to deserialize cache item: {}", e)))?;
            
            debug!("✅ File cache hit: {}", key);
            Ok(Some(item))
        } else {
            debug!("❌ File cache miss: {}", key);
            Ok(None)
        }
    }
    
    pub fn set(&self, key: &str, value: String, options: &CacheOptions) -> CacheResult<()> {
        let expires_at = options.ttl.map(|seconds| Utc::now() + chrono::Duration::seconds(seconds as i64));
        
        let item = CacheItem {
            value,
            created_at: Utc::now(),
            expires_at,
            tags: options.tags.clone(),
        };
        
        // Генерируем имя файла на основе ключа
        let file_name = self.generate_file_name(key);
        let file_path = self.cache_dir.join(&file_name);
        
        // Сохраняем данные в файл
        let file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(&file_path)
            .map_err(|e| CacheError::FileError(format!("Failed to create cache file: {}", e)))?;
        
        let mut writer = BufWriter::new(file);
        let data = serde_json::to_string(&item)
            .map_err(|e| CacheError::SerializationError(format!("Failed to serialize cache item: {}", e)))?;
        
        writer.write_all(data.as_bytes())
            .map_err(|e| CacheError::FileError(format!("Failed to write cache file: {}", e)))?;
        
        writer.flush()
            .map_err(|e| CacheError::FileError(format!("Failed to flush cache file: {}", e)))?;
        
        // Обновляем индекс
        let mut index_guard = self.index.lock()
            .map_err(|e| CacheError::FileError(format!("Failed to write index: {}", e)))?;
        
        let entry = CacheIndexEntry {
            file_name: file_name.clone(),
            created_at: Utc::now(),
            expires_at,
            tags: options.tags.clone(),
        };
        
        index_guard.insert(key.to_string(), entry);
        
        // Сохраняем индекс
        self.save_index(&index_guard)?;
        
        debug!("💾 File cache set: {}", key);
        Ok(())
    }
    
    pub fn delete(&self, key: &str, tags: Option<Vec<String>>) -> CacheResult<bool> {
        let mut index_guard = self.index.lock()
            .map_err(|e| CacheError::FileError(format!("Failed to read index: {}", e)))?;
        
        if let Some(entry) = index_guard.get(key) {
            // Проверяем теги если указаны
            if let Some(requested_tags) = tags {
                if !requested_tags.iter().all(|tag| entry.tags.contains(tag)) {
                    debug!("🏷️ Tags mismatch for file delete: {}", key);
                    return Ok(false);
                }
            }
            
            // Удаляем файл
            let file_path = self.cache_dir.join(&entry.file_name);
            if file_path.exists() {
                fs::remove_file(&file_path)
                    .map_err(|e| CacheError::FileError(format!("Failed to delete cache file: {}", e)))?;
            }
            
            // Удаляем из индекса
            index_guard.remove(key);
            
            // Сохраняем индекс
            self.save_index(&index_guard)?;
            
            debug!("🗑️ File cache delete: {}", key);
            Ok(true)
        } else {
            Ok(false)
        }
    }
    
    pub fn exists(&self, key: &str, tags: Option<Vec<String>>) -> CacheResult<bool> {
        let index_guard = self.index.lock()
            .map_err(|e| CacheError::FileError(format!("Failed to read index: {}", e)))?;
        
        if let Some(entry) = index_guard.get(key) {
            // Проверяем теги если указаны
            if let Some(requested_tags) = tags {
                Ok(requested_tags.iter().all(|tag| entry.tags.contains(tag)))
            } else {
                Ok(true)
            }
        } else {
            Ok(false)
        }
    }
    
    pub fn clear(&self) -> CacheResult<()> {
        let mut index_guard = self.index.lock()
            .map_err(|e| CacheError::FileError(format!("Failed to read index: {}", e)))?;
        
        // Удаляем все файлы
        for entry in index_guard.values() {
            let file_path = self.cache_dir.join(&entry.file_name);
            if file_path.exists() {
                fs::remove_file(&file_path)
                    .map_err(|e| CacheError::FileError(format!("Failed to delete cache file: {}", e)))?;
            }
        }
        
        // Очищаем индекс
        index_guard.clear();
        
        // Сохраняем индекс
        self.save_index(&index_guard)?;
        
        debug!("🗑️ File cache cleared");
        Ok(())
    }
    
    pub fn flush_by_tags(&self, tags: &[String]) -> CacheResult<usize> {
        debug!("🏷️ File cache flush by tags: {:?}", tags);
        
        let mut index_guard = self.index.lock()
            .map_err(|e| CacheError::FileError(format!("Failed to read index: {}", e)))?;
        
        let mut count = 0;
        let keys_to_remove: Vec<String> = index_guard
            .iter()
            .filter(|(_, entry)| {
                tags.iter().any(|tag| entry.tags.contains(tag))
            })
            .map(|(key, _)| key.clone())
            .collect();
        
        for key in keys_to_remove {
            if let Some(entry) = index_guard.get(&key) {
                // Удаляем файл
                let file_path = self.cache_dir.join(&entry.file_name);
                if file_path.exists() {
                    fs::remove_file(&file_path)
                        .map_err(|e| CacheError::FileError(format!("Failed to delete cache file: {}", e)))?;
                }
            }
            
            index_guard.remove(&key);
            count += 1;
        }
        
        // Сохраняем индекс
        self.save_index(&index_guard)?;
        
        debug!("🏷️ Flushed {} items by tags in file cache", count);
        Ok(count)
    }
    
    fn generate_file_name(&self, key: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(key.as_bytes());
        let result = hasher.finalize();
        format!("{:x}.cache", result)
    }
    
    fn save_index(&self, index: &HashMap<String, CacheIndexEntry>) -> CacheResult<()> {
        let data = serde_json::to_string(index)
            .map_err(|e| CacheError::SerializationError(format!("Failed to serialize index: {}", e)))?;
        
        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(&self.index_file)
            .map_err(|e| CacheError::FileError(format!("Failed to open index file: {}", e)))?;
        
        file.write_all(data.as_bytes())
            .map_err(|e| CacheError::FileError(format!("Failed to write index file: {}", e)))?;
        
        file.flush()
            .map_err(|e| CacheError::FileError(format!("Failed to flush index file: {}", e)))?;
        
        Ok(())
    }
}
