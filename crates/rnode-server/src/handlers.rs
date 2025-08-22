use neon::prelude::*;
use serde_json;
use crate::types::get_event_queue;
use crate::middleware::execute_middleware;

// Функция для обработки HTTP запросов - вызывается из JavaScript
pub fn process_http_request(mut cx: FunctionContext) -> JsResult<JsString> {
    let method = cx.argument::<JsString>(0)?.value(&mut cx);
    let path = cx.argument::<JsString>(1)?.value(&mut cx);
    
    // Вызываем JavaScript функцию getHandler(method, path)
    // Пока возвращаем заглушку
    let result = format!("Processing {} {} in JavaScript", method, path);
    
    Ok(cx.string(result))
}

// Динамический обработчик для зарегистрированных маршрутов
pub async fn dynamic_handler(
    req: axum::extract::Request,
    actual_path: String,  // Фактический запрошенный путь
    registered_path: String, 
    method: String, 
    _handler_id: String
) -> axum::response::Response<axum::body::Body> {
    use axum::response::Response;
    use axum::body::Body;
    use axum::http::StatusCode;
    
    // Извлекаем данные для middleware до разрушения Request
    let middleware_headers = req.headers().iter().map(|(k, v)| {
        (k.as_str().to_string(), v.to_str().unwrap_or("").to_string())
    }).collect::<std::collections::HashMap<_, _>>();
    
    let middleware_cookies = req.headers()
        .get("cookie")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();
    
    // Выполняем middleware перед основным обработчиком
    let middleware_custom_params = match execute_middleware(
        actual_path.clone(), 
        method.clone(), 
        middleware_headers, 
        middleware_cookies
    ).await {
        Ok(custom_params) => custom_params,
        Err(middleware_response) => return middleware_response,
    };
    
    // Разрушаем Request на части для извлечения body
    let (parts, body) = req.into_parts();
    
    // Параметры уже извлечены через Axum экстракторы
    let uri = parts.uri.clone();
    let query_string = uri.query().unwrap_or("");
    
    // Извлекаем cookies из заголовков
    let cookies = parts.headers
        .get("cookie")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();
    
    // Извлекаем все заголовки
    let mut headers_json = serde_json::Map::new();
    for (key, value) in &parts.headers {
        let key_str = key.as_str().to_string();
        if let Ok(value_str) = value.to_str() {
            headers_json.insert(key_str, serde_json::Value::String(value_str.to_string()));
        }
    }
    
    // Извлекаем body из запроса
    let body_bytes = match axum::body::to_bytes(body, usize::MAX).await {
        Ok(bytes) => bytes,
        Err(_) => axum::body::Bytes::new(),
    };
    let body_string = String::from_utf8_lossy(&body_bytes).to_string();
    
    // Создаем JSON объект с параметрами
    let mut request_data = serde_json::Map::new();
    request_data.insert("method".to_string(), serde_json::Value::String(method.clone()));
    request_data.insert("registeredPath".to_string(), serde_json::Value::String(registered_path.clone()));
    request_data.insert("path".to_string(), serde_json::Value::String(actual_path.clone())); // Фактический путь для req.url
    request_data.insert("body".to_string(), serde_json::Value::String(body_string)); // Body запроса
    request_data.insert("cookies".to_string(), serde_json::Value::String(cookies)); // Cookies из заголовков
    request_data.insert("headers".to_string(), serde_json::Value::Object(headers_json)); // Все заголовки
    
    // Извлекаем path параметры (например, :id -> 123)
    let mut path_params_json = serde_json::Map::new();
    let actual_segments: Vec<&str> = actual_path.split('/').collect();
    let registered_segments: Vec<&str> = registered_path.split('/').collect();
    
    if actual_segments.len() == registered_segments.len() {
        for (i, registered_seg) in registered_segments.iter().enumerate() {
            if registered_seg.starts_with(':') && i < actual_segments.len() {
                let param_name = &registered_seg[1..]; // Убираем :
                let param_value = actual_segments[i];
                path_params_json.insert(param_name.to_string(), serde_json::Value::String(param_value.to_string()));
            }
        }
    }
    
    // Парсим query параметры
    let mut query_params_json = serde_json::Map::new();
    if !query_string.is_empty() {
        for pair in query_string.split('&') {
            if let Some((key, value)) = pair.split_once('=') {
                query_params_json.insert(key.to_string(), serde_json::Value::String(value.to_string()));
            }
        }
    }
    
    request_data.insert("pathParams".to_string(), serde_json::Value::Object(path_params_json.clone()));
    request_data.insert("queryParams".to_string(), serde_json::Value::Object(query_params_json.clone()));
    
    // Добавляем customParams из middleware
    request_data.insert("customParams".to_string(), serde_json::Value::Object(middleware_custom_params));
    
    let request_json = serde_json::to_string(&request_data).unwrap();
    
    // Клонируем данные для передачи в JavaScript
    let request_json_clone = request_json.clone();
    
    // Создаем канал для получения результата
    let (tx, rx) = std::sync::mpsc::channel();
    
    let event_queue = get_event_queue();
    let channel = {
        let event_queue_map = event_queue.read().unwrap();
        event_queue_map.clone()
    };
    
    if let Some(channel) = channel {
        let _join_handle = channel.send(move |mut cx| {
            // Вызываем глобальную функцию getHandler
            let global: Handle<JsObject> = cx.global("global")?;
            let get_handler_fn: Handle<JsFunction> = global.get(&mut cx, "getHandler")?;
            
            // Вызываем getHandler(requestJson)
            let result: Handle<JsString> = get_handler_fn
                .call_with(&mut cx)
                .arg(cx.string(&request_json_clone))
                .apply(&mut cx)?;
            
            // Отправляем результат обратно в HTTP поток
            let _ = tx.send(result.value(&mut cx));
            Ok(())
        });
        
        // Ждем результат от JavaScript
        let result = match rx.recv_timeout(std::time::Duration::from_millis(1000)) {
            Ok(result) => result,
            Err(_) => format!("Timeout waiting for JavaScript handler: {} {}", method, registered_path)
        };
        
        // Парсим JSON ответ от JavaScript
        let response_json_value: serde_json::Value = serde_json::from_str(&result).unwrap_or_else(|_| {
            serde_json::json!({"content": format!("Failed to parse JS response: {}", result), "contentType": "text/plain"})
        });

        let response_text = response_json_value["content"].as_str().unwrap_or("").to_string();
        let content_type = response_json_value["contentType"].as_str().unwrap_or("text/plain").to_string();

        // Создаем ответ с заголовками
        let mut response_builder = Response::builder()
            .status(StatusCode::OK)
            .header("content-type", content_type);
        
        // Добавляем заголовки из JavaScript ответа
        if let Some(headers) = response_json_value["headers"].as_object() {
            for (key, value) in headers {
                if let Some(value_str) = value.as_str() {
                    response_builder = response_builder.header(key, value_str);
                } else if let Some(value_array) = value.as_array() {
                    // Обрабатываем массивы заголовков (например, Set-Cookie)
                    for item in value_array {
                        if let Some(item_str) = item.as_str() {
                            response_builder = response_builder.header(key, item_str);
                        }
                    }
                }
            }
        }
        
        response_builder.body(Body::from(response_text)).unwrap()
    } else {
        // Channel недоступен, возвращаем ошибку
        let response_text = format!("No channel available for {} {}", method, registered_path);
        
        Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .header("content-type", "text/plain")
            .body(Body::from(response_text))
            .unwrap()
    }
}
