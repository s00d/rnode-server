use crate::middleware::execute_middleware;
use crate::types::get_event_queue;
use base64::Engine;
use futures::stream::{self};
use multer::Multipart;
use neon::prelude::*;
use serde_json;
use std::convert::Infallible;

// Структура для информации о файле
#[derive(Debug)]
struct FileInfo {
    filename: String,
    content_type: String,
    size: usize,
    data: String, // Base64 encoded data
}

// Структура для результата парсинга multipart
type MultipartResult = Result<
    (
        std::collections::HashMap<String, String>,
        std::collections::HashMap<String, FileInfo>,
    ),
    Box<dyn std::error::Error>,
>;

// Функция для парсинга multipart/form-data
async fn parse_multipart_data(
    body_bytes: axum::body::Bytes,
    content_type: &str,
) -> MultipartResult {
    // Получаем boundary из content-type
    let boundary = content_type
        .split("boundary=")
        .nth(1)
        .ok_or("No boundary found")?;

    // Создаем stream из bytes
    let stream =
        stream::once(async move { Result::<axum::body::Bytes, Infallible>::Ok(body_bytes) });

    // Создаем Multipart из stream и boundary
    let mut multipart = Multipart::new(stream, boundary);

    let mut fields = std::collections::HashMap::new();
    let mut files = std::collections::HashMap::new();

    // Парсим multipart данные
    while let Some(field) = multipart.next_field().await? {
        let field_name = field.name().unwrap_or("unknown").to_string();

        if let Some(filename) = field.file_name() {
            // Это файл
            let filename = filename.to_string();
            let field_content_type = field
                .content_type()
                .map(|ct| ct.to_string())
                .unwrap_or_else(|| "application/octet-stream".to_string());

            // Читаем содержимое файла
            let data = field.bytes().await?;
            let size = data.len();

            // Кодируем в Base64 для передачи в JSON
            let data_base64 = base64::engine::general_purpose::STANDARD.encode(&data);

            let file_info = FileInfo {
                filename,
                content_type: field_content_type,
                size,
                data: data_base64,
            };

            files.insert(field_name, file_info);
        } else {
            // Это обычное поле формы
            let value = field.text().await?;
            fields.insert(field_name, value);
        }
    }

    Ok((fields, files))
}

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
    actual_path: String, // Фактический запрошенный путь
    registered_path: String,
    method: String,
    _handler_id: String,
) -> axum::response::Response<axum::body::Body> {
    println!("🔍 Dynamic handler called:");
    println!("  Method: {}", method);
    println!("  Actual path: {}", actual_path);
    println!("  Registered path: {}", registered_path);
    println!("  Handler ID: {}", _handler_id);
    use axum::body::Body;
    use axum::http::StatusCode;
    use axum::response::Response;

    // Разрушаем Request на части для извлечения body
    let (parts, body) = req.into_parts();

    // Параметры уже извлечены через Axum экстракторы
    let uri = parts.uri.clone();
    let query_string = uri.query().unwrap_or("");

    // Извлекаем cookies из заголовков
    let cookies = parts
        .headers
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

    // Определяем Content-Type для правильного парсинга
    let content_type = parts
        .headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    // Сначала получаем bytes из body
    let body_bytes = match axum::body::to_bytes(body, usize::MAX).await {
        Ok(bytes) => bytes,
        Err(_) => axum::body::Bytes::new(),
    };

    // Парсим body в зависимости от Content-Type
    let (body_data, files_data) = if content_type.contains("multipart/form-data") {
        // Парсим multipart/form-data
        match parse_multipart_data(body_bytes.clone(), &content_type).await {
            Ok((fields, files)) => {
                // Создаем JSON для полей формы
                let mut fields_json = serde_json::Map::new();
                for (key, value) in fields {
                    fields_json.insert(key, serde_json::Value::String(value));
                }

                // Создаем JSON для файлов
                let mut files_json = serde_json::Map::new();
                for (key, file_info) in files {
                    let mut file_json = serde_json::Map::new();
                    file_json.insert(
                        "filename".to_string(),
                        serde_json::Value::String(file_info.filename),
                    );
                    file_json.insert(
                        "contentType".to_string(),
                        serde_json::Value::String(file_info.content_type),
                    );
                    file_json.insert(
                        "size".to_string(),
                        serde_json::Value::Number(serde_json::Number::from(file_info.size)),
                    );
                    file_json.insert(
                        "data".to_string(),
                        serde_json::Value::String(file_info.data),
                    );
                    files_json.insert(key, serde_json::Value::Object(file_json));
                }

                (
                    serde_json::Value::Object(fields_json),
                    serde_json::Value::Object(files_json),
                )
            }
            Err(_) => {
                // Fallback к обычному body
                let body_string = String::from_utf8_lossy(&body_bytes).to_string();
                (
                    serde_json::Value::String(body_string),
                    serde_json::Value::Null,
                )
            }
        }
    } else {
        // Обычный body (JSON, form-urlencoded, plain text)
        let body_string = String::from_utf8_lossy(&body_bytes).to_string();
        (
            serde_json::Value::String(body_string),
            serde_json::Value::Null,
        )
    };

    // Создаем JSON объект с параметрами
    let mut request_data = serde_json::Map::new();
    request_data.insert(
        "method".to_string(),
        serde_json::Value::String(method.clone()),
    );
    request_data.insert(
        "registeredPath".to_string(),
        serde_json::Value::String(registered_path.clone()),
    );
    request_data.insert(
        "path".to_string(),
        serde_json::Value::String(actual_path.clone()),
    ); // Фактический путь для req.url
    request_data.insert("body".to_string(), body_data); // Body запроса (поля формы или обычный body)
    request_data.insert("files".to_string(), files_data); // Файлы (если есть)
    request_data.insert(
        "contentType".to_string(),
        serde_json::Value::String(content_type),
    ); // Content-Type
    request_data.insert("cookies".to_string(), serde_json::Value::String(cookies)); // Cookies из заголовков
    request_data.insert(
        "headers".to_string(),
        serde_json::Value::Object(headers_json),
    ); // Все заголовки

    // Извлекаем path параметры (например, :id -> 123 или {*filepath} -> documents/2024/january/record.png)
    let mut path_params_json = serde_json::Map::new();
    let actual_segments: Vec<&str> = actual_path.split('/').collect();
    let registered_segments: Vec<&str> = registered_path.split('/').collect();

    // Обрабатываем простые параметры типа :id
    if actual_segments.len() == registered_segments.len() {
        for (i, registered_seg) in registered_segments.iter().enumerate() {
            if registered_seg.starts_with(':') && i < actual_segments.len() {
                let param_name = &registered_seg[1..]; // Убираем :
                let param_value = actual_segments[i];
                path_params_json.insert(
                    param_name.to_string(),
                    serde_json::Value::String(param_value.to_string()),
                );
            }
        }
    }

    // Обрабатываем wildcard параметры типа {*filepath}
    for (i, registered_seg) in registered_segments.iter().enumerate() {
        if registered_seg.contains("{*") && registered_seg.ends_with("}") {
            // Извлекаем имя параметра из {*param}
            let param_name = registered_seg
                .trim_start_matches("{*")
                .trim_end_matches("}");

            if i < actual_segments.len() {
                // Для wildcard параметра берем все оставшиеся сегменты
                let param_value = actual_segments[i..].join("/");
                if !param_value.is_empty() {
                    println!(
                        "📁 Wildcard параметр {{*{}}}: '{}'",
                        param_name, param_value
                    );
                    path_params_json.insert(
                        param_name.to_string(),
                        serde_json::Value::String(param_value),
                    );
                }
            }
        }
    }

    // Парсим query параметры
    let mut query_params_json = serde_json::Map::new();
    if !query_string.is_empty() {
        for pair in query_string.split('&') {
            if let Some((key, value)) = pair.split_once('=') {
                query_params_json.insert(
                    key.to_string(),
                    serde_json::Value::String(value.to_string()),
                );
            }
        }
    }

    request_data.insert(
        "pathParams".to_string(),
        serde_json::Value::Object(path_params_json.clone()),
    );
    request_data.insert(
        "queryParams".to_string(),
        serde_json::Value::Object(query_params_json.clone()),
    );

    // Выполняем middleware после извлечения всех параметров
    match execute_middleware(&mut request_data).await {
        Ok(()) => (), // Middleware успешно выполнен, request_data модифицирован
        Err(middleware_response) => return middleware_response,
    };

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
            Err(_) => format!(
                "Timeout waiting for JavaScript handler: {} {}",
                method, registered_path
            ),
        };

        // Парсим JSON ответ от JavaScript
        let response_json_value: serde_json::Value = serde_json::from_str(&result).unwrap_or_else(|_| {
            serde_json::json!({"content": format!("Failed to parse JS response: {}", result), "contentType": "text/plain"})
        });

        let response_text = response_json_value["content"]
            .as_str()
            .unwrap_or("")
            .to_string();
        let content_type = response_json_value["contentType"]
            .as_str()
            .unwrap_or("text/plain")
            .to_string();

        // Создаем ответ с заголовками
        let mut response_builder = Response::builder().header("content-type", content_type);

        // Обрабатываем статус код из заголовков JavaScript ответа
        let mut status_code = StatusCode::OK;
        if let Some(headers) = response_json_value["headers"].as_object() {
            if let Some(status_str) = headers.get("status").and_then(|v| v.as_str()) {
                if let Ok(status_u16) = status_str.parse::<u16>() {
                    status_code = StatusCode::from_u16(status_u16).unwrap_or(StatusCode::OK);
                }
            }
        }
        response_builder = response_builder.status(status_code);

        // Добавляем заголовки из JavaScript ответа (исключая служебный заголовок status)
        if let Some(headers) = response_json_value["headers"].as_object() {
            for (key, value) in headers {
                if key != "status" {
                    // Исключаем служебный заголовок status
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
