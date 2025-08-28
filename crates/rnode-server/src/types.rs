use neon::event::Channel;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::OnceLock;
use std::sync::RwLock;

// Structure for storing routes and their handlers
#[derive(Clone)]
pub struct RouteInfo {
    pub path: String,
    pub method: String,
    #[allow(dead_code)]
    pub handler_id: String, // Unique ID for handler
}

// Structure for storing middleware
#[derive(Debug, Clone)]
pub struct MiddlewareInfo {
    pub path: String,
    pub middleware_id: String,
}

// Synchronous storage for routes
pub static ROUTES: OnceLock<RwLock<HashMap<String, RouteInfo>>> = OnceLock::new();

// Global middleware storage
pub static MIDDLEWARE: OnceLock<RwLock<Vec<MiddlewareInfo>>> = OnceLock::new();

// Structure for file download settings
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DownloadRouteConfig {
    pub path: String,
    pub folder: String,
    pub max_file_size: Option<u64>,
    pub allowed_extensions: Option<Vec<String>>,
    pub blocked_paths: Option<Vec<String>>,
    pub allow_hidden_files: bool,
    pub allow_system_files: bool,
}

// Structure for file upload settings
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UploadRouteConfig {
    pub path: String,
    pub folder: String,
    pub allowed_subfolders: Option<Vec<String>>,
    pub max_file_size: Option<u64>,
    pub allowed_extensions: Option<Vec<String>>,
    pub allowed_mime_types: Option<Vec<String>>,
    pub multiple: bool,
    pub max_files: Option<u32>,
    pub overwrite: bool,
}

// Global channel for communication between HTTP thread and JavaScript thread
pub static EVENT_QUEUE: OnceLock<RwLock<Option<Channel>>> = OnceLock::new();

pub fn get_event_queue() -> &'static RwLock<Option<Channel>> {
    EVENT_QUEUE.get_or_init(|| RwLock::new(None))
}

// Global storage for download settings
pub static DOWNLOAD_ROUTES: OnceLock<RwLock<HashMap<String, DownloadRouteConfig>>> =
    OnceLock::new();

// Global storage for upload settings
pub static UPLOAD_ROUTES: OnceLock<RwLock<HashMap<String, UploadRouteConfig>>> = OnceLock::new();

pub fn get_routes() -> &'static RwLock<HashMap<String, RouteInfo>> {
    ROUTES.get_or_init(|| RwLock::new(HashMap::new()))
}

pub fn get_middleware() -> &'static RwLock<Vec<MiddlewareInfo>> {
    MIDDLEWARE.get_or_init(|| RwLock::new(Vec::new()))
}

pub fn get_download_routes() -> &'static RwLock<HashMap<String, DownloadRouteConfig>> {
    DOWNLOAD_ROUTES.get_or_init(|| RwLock::new(HashMap::new()))
}

pub fn get_upload_routes() -> &'static RwLock<HashMap<String, UploadRouteConfig>> {
    UPLOAD_ROUTES.get_or_init(|| RwLock::new(HashMap::new()))
}
