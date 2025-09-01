// Handlers module - объединяет обработчики HTTP запросов и middleware
pub mod dynamic_handler;
pub mod middleware;
pub mod request_processor;
pub mod response_builder;
pub mod timeout_manager;
pub mod javascript_bridge;

// Re-export main functions for backward compatibility
pub use dynamic_handler::dynamic_handler;
pub use middleware::register_middleware;
pub use request_processor::process_http_request;
