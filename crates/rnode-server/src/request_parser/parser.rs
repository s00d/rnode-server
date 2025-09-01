use serde_json::{Map, Value};
use crate::request_parser::multipart::parse_multipart_data;
use crate::request_parser::types::ContentType;
use base64::Engine;


/// Класс для парсинга тела HTTP запроса
pub struct RequestParser;

impl RequestParser {
        /// Парсит тело запроса и возвращает кортеж (body, files)
    pub async fn parse_request_body(
        body_bytes: &axum::body::Bytes,
        content_type: &str,
    ) -> (Value, Value) {
        let content_type_enum = ContentType::from(content_type);
        
        match content_type_enum {
            ContentType::MultipartFormData => {
                // Parse multipart/form-data
                match parse_multipart_data(body_bytes, content_type).await {
                    Ok((fields, files)) => {
                        // Create JSON for form fields
                        let mut fields_json = Map::new();
                        for (key, value) in fields {
                            fields_json.insert(key, Value::String(value));
                        }

                        // Create JSON for files
                        let mut files_json = Map::new();
                        for (key, file_info) in files {
                            let mut file_json = Map::new();
                            file_json.insert("filename".to_string(), Value::String(file_info.filename));
                            file_json.insert(
                                "contentType".to_string(),
                                Value::String(file_info.content_type),
                            );
                            file_json.insert(
                                "size".to_string(),
                                Value::Number(serde_json::Number::from(file_info.size)),
                            );
                            file_json.insert("data".to_string(), Value::String(file_info.data));
                            files_json.insert(key, Value::Object(file_json));
                        }

                        (Value::Object(fields_json), Value::Object(files_json))
                    }
                    Err(_) => {
                        // Fallback to regular body
                        let body_string = String::from_utf8_lossy(body_bytes).to_string();
                        (Value::String(body_string), Value::Null)
                    }
                }
            }
            ContentType::Json => {
                // Parse JSON content
                match serde_json::from_slice::<Value>(body_bytes) {
                    Ok(json_value) => {
                        // JSON successfully parsed
                        (json_value, Value::Null)
                    }
                    Err(_) => {
                        // JSON parsing failed, fallback to string
                        let body_string = String::from_utf8_lossy(body_bytes).to_string();
                        (Value::String(body_string), Value::Null)
                    }
                }
            }
            ContentType::FormUrlEncoded => {
                // Parse form-urlencoded content
                let body_string = String::from_utf8_lossy(body_bytes).to_string();
                let mut form_data = Map::new();

                for pair in body_string.split('&') {
                    if let Some((key, value)) = pair.split_once('=') {
                        let decoded_key = urlencoding::decode(key)
                            .unwrap_or_else(|_| std::borrow::Cow::Borrowed(key))
                            .into_owned();
                        let decoded_value = urlencoding::decode(value)
                            .unwrap_or_else(|_| std::borrow::Cow::Borrowed(value))
                            .into_owned();
                        form_data.insert(decoded_key, Value::String(decoded_value));
                    }
                }

                (Value::Object(form_data), Value::Null)
            }
            ContentType::Text => {
                // Handle text-based content types
                let body_string = String::from_utf8_lossy(body_bytes).to_string();
                (Value::String(body_string), Value::Null)
            }
            ContentType::Binary => {
                // Handle binary content types
                let encoded_data = base64::engine::general_purpose::STANDARD.encode(body_bytes);
                (Value::String(encoded_data), Value::Null)
            }
            ContentType::Unknown => {
                // Default fallback for unknown content types
                let body_string = String::from_utf8_lossy(body_bytes).to_string();
                (Value::String(body_string), Value::Null)
            }
        }
    }
    
    // /// Получить тип контента из строки
    // pub fn get_content_type(content_type: &str) -> ContentType {
    //     ContentType::from(content_type)
    // }
    //
    /// Проверить, является ли контент multipart
    pub fn is_multipart(content_type: &str) -> bool {
        matches!(ContentType::from(content_type), ContentType::MultipartFormData)
    }

    // /// Проверить, является ли контент JSON
    // pub fn is_json(content_type: &str) -> bool {
    //     matches!(ContentType::from(content_type), ContentType::Json)
    // }
    //
    // /// Проверить, является ли контент form-urlencoded
    // pub fn is_form_urlencoded(content_type: &str) -> bool {
    //     matches!(ContentType::from(content_type), ContentType::FormUrlEncoded)
    // }
    //
    // /// Проверить, является ли контент текстовым
    // pub fn is_text(content_type: &str) -> bool {
    //     matches!(ContentType::from(content_type), ContentType::Text)
    // }
    //
    // /// Проверить, является ли контент бинарным
    // pub fn is_binary(content_type: &str) -> bool {
    //     matches!(ContentType::from(content_type), ContentType::Binary)
    // }
    //
    // /// Проверить, является ли контент неизвестным
    // pub fn is_unknown(content_type: &str) -> bool {
    //     matches!(ContentType::from(content_type), ContentType::Unknown)
    // }
}
