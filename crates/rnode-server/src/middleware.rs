use neon::prelude::*;
use serde_json;
use crate::types::{get_middleware, get_event_queue};

// Функция для регистрации middleware
pub fn register_middleware(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let path = cx.argument::<JsString>(0)?.value(&mut cx);
    let _handler = cx.argument::<JsFunction>(1)?; // JS функция-middleware
    
    println!("Registering middleware for path: {}", path);
    
    // Генерируем уникальный ID для middleware
    let handler_id = format!("middleware_{}_{}", path.replace('/', "_"), std::process::id());
    
    // Добавляем middleware в глобальное хранилище
    let middleware = get_middleware();
    {
        let mut middleware_vec = middleware.write().unwrap();
        middleware_vec.push(crate::types::MiddlewareInfo {
            path: path.clone(),
            handler_id: handler_id.clone(),
        });
    }
    
    println!("Middleware registered successfully: {} -> {}", path, handler_id);
    
    Ok(cx.undefined())
}

// Функция для выполнения middleware
pub async fn execute_middleware(
    actual_path: String,
    method: String,
    headers: std::collections::HashMap<String, String>,
    cookies: String,
) -> Result<serde_json::Map<String, serde_json::Value>, axum::response::Response<axum::body::Body>> {
    use axum::response::Response;
    use axum::body::Body;
    use axum::http::StatusCode;
    
    let middleware = get_middleware();
    let middleware_vec = middleware.read().unwrap();
    
    // Собираем customParams от всех middleware
    let mut accumulated_custom_params = serde_json::Map::new();
    
    for middleware_info in middleware_vec.iter() {
        // Проверяем, подходит ли middleware для данного пути
        if actual_path.starts_with(&middleware_info.path) || middleware_info.path == "*" {
            // Создаем headers_json из переданных headers
            let mut headers_json = serde_json::Map::new();
            for (key, value) in &headers {
                headers_json.insert(key.clone(), serde_json::Value::String(value.clone()));
            }
            
            // Создаем данные для middleware
            let mut middleware_data = serde_json::Map::new();
            middleware_data.insert("method".to_string(), serde_json::Value::String(method.clone()));
            middleware_data.insert("path".to_string(), serde_json::Value::String(actual_path.clone()));
            middleware_data.insert("cookies".to_string(), serde_json::Value::String(cookies.clone()));
            middleware_data.insert("headers".to_string(), serde_json::Value::Object(headers_json));
            middleware_data.insert("isMiddleware".to_string(), serde_json::Value::Bool(true));
            
            // Добавляем пустые customParams для middleware
            middleware_data.insert("customParams".to_string(), serde_json::Value::Object(serde_json::Map::new()));
            
            let middleware_json = serde_json::to_string(&middleware_data).unwrap();
            
            // Выполняем middleware через JavaScript
            let event_queue = get_event_queue();
            let channel = {
                let event_queue_map = event_queue.read().unwrap();
                event_queue_map.clone()
            };
            
            if let Some(channel) = channel {
                let (tx, rx) = std::sync::mpsc::channel();
                let middleware_json_clone = middleware_json.clone();
                
                let _join_handle = channel.send(move |mut cx| {
                    let global: Handle<JsObject> = cx.global("global")?;
                    let execute_middleware_fn: Handle<JsFunction> = global.get(&mut cx, "executeMiddleware")?;
                    
                    let result: Handle<JsString> = execute_middleware_fn
                        .call_with(&mut cx)
                        .arg(cx.string(&middleware_json_clone))
                        .apply(&mut cx)?;
                    
                    let _ = tx.send(result.value(&mut cx));
                    Ok(())
                });
                
                // Ждем результат от middleware
                let result = match rx.recv_timeout(std::time::Duration::from_millis(1000)) {
                    Ok(result) => result,
                    Err(_) => {
                        return Err(Response::builder()
                            .status(StatusCode::INTERNAL_SERVER_ERROR)
                            .body(Body::from("Middleware timeout"))
                            .unwrap());
                    }
                };
                
                // Парсим результат middleware
                let middleware_result: serde_json::Value = serde_json::from_str(&result).unwrap_or_else(|_| {
                    serde_json::json!({"shouldContinue": true})
                });
                
                // Если middleware хочет прервать выполнение
                if let Some(should_continue) = middleware_result["shouldContinue"].as_bool() {
                    if !should_continue {
                        // Middleware прерывает выполнение
                        let content = middleware_result["content"].as_str().unwrap_or("").to_string();
                        let content_type = middleware_result["contentType"].as_str().unwrap_or("text/plain").to_string();
                        
                        let mut response_builder = Response::builder()
                            .status(StatusCode::OK)
                            .header("content-type", content_type);
                        
                        // Добавляем заголовки из middleware
                        if let Some(headers) = middleware_result["headers"].as_object() {
                            for (key, value) in headers {
                                if let Some(value_str) = value.as_str() {
                                    response_builder = response_builder.header(key, value_str);
                                }
                            }
                        }
                        
                        let response = response_builder.body(Body::from(content)).unwrap();
                        return Err(response);
                    }
                }
                
                // Собираем customParams из middleware для передачи дальше
                if let Some(custom_params) = middleware_result["customParams"].as_object() {
                    for (key, value) in custom_params {
                        accumulated_custom_params.insert(key.clone(), value.clone());
                    }
                }
            }
        }
    }
    
    Ok(accumulated_custom_params)
}
