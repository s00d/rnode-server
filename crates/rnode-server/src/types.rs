use neon::event::Channel;
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

// Глобальный канал для связи между HTTP потоком и JavaScript потоком
pub static EVENT_QUEUE: OnceLock<RwLock<Option<Channel>>> = OnceLock::new();

// Глобальное хранилище статических файлов в памяти
pub static STATIC_FILES: OnceLock<RwLock<HashMap<String, (Vec<u8>, String)>>> = OnceLock::new();

pub fn get_routes() -> &'static RwLock<HashMap<String, RouteInfo>> {
    ROUTES.get_or_init(|| RwLock::new(HashMap::new()))
}

pub fn get_middleware() -> &'static RwLock<Vec<MiddlewareInfo>> {
    MIDDLEWARE.get_or_init(|| RwLock::new(Vec::new()))
}

pub fn get_event_queue() -> &'static RwLock<Option<Channel>> {
    EVENT_QUEUE.get_or_init(|| RwLock::new(None))
}

pub fn get_static_files() -> &'static RwLock<HashMap<String, (Vec<u8>, String)>> {
    STATIC_FILES.get_or_init(|| RwLock::new(HashMap::new()))
}
