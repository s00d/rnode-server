use log::debug;
use serde_json;
use axum::http::StatusCode;
use axum::body::Body;

// Утилиты для построения HTTP ответов
pub struct ResponseBuilder;

impl ResponseBuilder {
    // Создание ответа из JSON данных
    pub fn from_json_response(
        response_json_value: serde_json::Value,
        dev_mode: bool,
    ) -> axum::response::Response<Body> {
        let response_text = response_json_value["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        let status = response_json_value["status"]
            .as_u64()
            .map(|s| s as u16)
            .unwrap_or(200);
        let content_type = response_json_value["contentType"]
            .as_str()
            .unwrap_or("text/plain");

        debug!("🔍 Setting status: {}", status);
        debug!("🔍 Setting content-type: {}", content_type);

        // Create response_builder for Axum compatibility
        let mut response_builder = axum::response::Response::builder().status(status);

        // Устанавливаем content-type из заголовка
        response_builder = response_builder.header("content-type", content_type);

        // Добавляем заголовки из Response объекта (исключая системные заголовки)
        if let Some(headers) = response_json_value["headers"].as_object() {
            for (key, value) in headers {
                let key_lower = key.to_lowercase();
                // Пропускаем системные заголовки, которые Axum устанавливает автоматически
                if ![
                    "status",
                    "content-type",
                    "content-length",
                    "transfer-encoding",
                    "connection",
                    "keep-alive",
                ]
                .contains(&key_lower.as_str())
                {
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

        // Check error condition
        debug!("🔍 Checking error condition - Status: {}, Content-Type: '{}'", status, content_type);
        if status >= 400 && content_type == "text/plain" {
            debug!("⚠️ Error condition met - generating error page");
            let error_message = response_json_value["content"]
                .as_str()
                .unwrap_or("An error occurred");

            let status_code = StatusCode::from_u16(status as u16)
                .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);

            debug!("🔍 Generating error page for status: {}, message: '{}'", status_code, error_message);
            return crate::html_templates::generate_error_page(
                status_code,
                "Error",
                error_message,
                None,
                dev_mode,
            );
        } else {
            debug!("✅ No error condition - continuing with normal response");
        }

        response_builder.body(Body::from(response_text)).unwrap()
    }
}
