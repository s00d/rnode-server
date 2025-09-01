use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheItem<T> {
    pub value: T,
    pub created_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    pub default_ttl: u64,
    pub redis_url: Option<String>,
    pub file_cache_path: String,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            default_ttl: 3600,
            redis_url: None,
            file_cache_path: "./cache".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheOptions {
    pub ttl: Option<u64>,
    pub tags: Vec<String>,
}

impl Default for CacheOptions {
    fn default() -> Self {
        Self {
            ttl: None,
            tags: Vec::new(),
        }
    }
}

#[derive(Debug)]
pub enum CacheError {
    RedisError(String),
    FileError(String),
    SerializationError(String),
    DeserializationError(String),
}

impl std::fmt::Display for CacheError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CacheError::RedisError(msg) => write!(f, "Redis error: {}", msg),
            CacheError::FileError(msg) => write!(f, "File error: {}", msg),
            CacheError::SerializationError(msg) => write!(f, "Serialization error: {}", msg),
            CacheError::DeserializationError(msg) => write!(f, "Deserialization error: {}", msg),
        }
    }
}

impl std::error::Error for CacheError {}

pub type CacheResult<T> = Result<T, CacheError>;

