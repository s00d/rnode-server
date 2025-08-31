use std::collections::HashMap;
use std::sync::OnceLock;
use std::sync::RwLock;
use super::types::StaticFile;

// Global storage for static files cache
static STATIC_FILES_CACHE: OnceLock<RwLock<HashMap<String, StaticFile>>> = OnceLock::new();

// Function for getting static files cache
pub fn get_static_files_cache() -> &'static RwLock<HashMap<String, StaticFile>> {
    STATIC_FILES_CACHE.get_or_init(|| RwLock::new(HashMap::new()))
}
