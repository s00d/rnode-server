use neon::event::Channel;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::OnceLock;
use std::sync::RwLock;

// Структура для хранения маршрутов и их обработчиков
#[derive(Clone)]
pub struct RouteInfo {
    pub path: String,
    pub method: String,
    #[allow(dead_code)]
    pub handler_id: String, // Уникальный ID для обработчика
}

// Структура для хранения middleware
#[derive(Clone)]
pub struct MiddlewareInfo {
    pub path: String,
    #[allow(dead_code)]
    pub handler_id: String,
}

// Синхронное хранилище маршрутов
pub static ROUTES: OnceLock<RwLock<HashMap<String, RouteInfo>>> = OnceLock::new();

// Синхронное хранилище middleware
pub static MIDDLEWARE: OnceLock<RwLock<Vec<MiddlewareInfo>>> = OnceLock::new();

// Структура для настроек скачивания файлов
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

// Структура для настроек загрузки файлов
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

// Глобальный канал для связи между HTTP потоком и JavaScript потоком
pub static EVENT_QUEUE: OnceLock<RwLock<Option<Channel>>> = OnceLock::new();

// Глобальное хранилище настроек скачивания
pub static DOWNLOAD_ROUTES: OnceLock<RwLock<HashMap<String, DownloadRouteConfig>>> =
    OnceLock::new();

// Глобальное хранилище настроек загрузки
pub static UPLOAD_ROUTES: OnceLock<RwLock<HashMap<String, UploadRouteConfig>>> = OnceLock::new();

pub fn get_routes() -> &'static RwLock<HashMap<String, RouteInfo>> {
    ROUTES.get_or_init(|| RwLock::new(HashMap::new()))
}

pub fn get_middleware() -> &'static RwLock<Vec<MiddlewareInfo>> {
    MIDDLEWARE.get_or_init(|| RwLock::new(Vec::new()))
}

pub fn get_event_queue() -> &'static RwLock<Option<Channel>> {
    EVENT_QUEUE.get_or_init(|| RwLock::new(None))
}

pub fn get_download_routes() -> &'static RwLock<HashMap<String, DownloadRouteConfig>> {
    DOWNLOAD_ROUTES.get_or_init(|| RwLock::new(HashMap::new()))
}

pub fn get_upload_routes() -> &'static RwLock<HashMap<String, UploadRouteConfig>> {
    UPLOAD_ROUTES.get_or_init(|| RwLock::new(HashMap::new()))
}
