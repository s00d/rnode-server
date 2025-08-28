use base64::Engine;
use futures::stream::{self};
use multer::Multipart;
use serde_json::{Map, Value};
use std::collections::HashMap;

// Structure for file information
#[derive(Debug)]
struct FileInfo {
    filename: String,
    content_type: String,
    size: usize,
    data: String, // Base64 encoded data
}

// Structure for multipart parsing result
type MultipartResult =
    Result<(HashMap<String, String>, HashMap<String, FileInfo>), Box<dyn std::error::Error>>;

/// Класс для парсинга тела HTTP запроса
pub struct RequestParser;

impl RequestParser {
    /// Парсит тело запроса и возвращает кортеж (body, files)
    pub async fn parse_request_body(
        body_bytes: &axum::body::Bytes,
        content_type: &str,
    ) -> (Value, Value) {
        if content_type.contains("multipart/form-data") {
            // Parse multipart/form-data
            match Self::parse_multipart_data(body_bytes, content_type).await {
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
        } else if content_type.contains("application/json") {
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
        } else if content_type.contains("application/x-www-form-urlencoded") {
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
        } else if content_type.contains("text/")
            || content_type.contains("application/xml")
            || content_type.contains("application/javascript")
        {
            // Handle text-based content types
            let body_string = String::from_utf8_lossy(body_bytes).to_string();
            (Value::String(body_string), Value::Null)
        } else if content_type.contains("application/octet-stream")
            || content_type.contains("image/")
            || content_type.contains("video/")
            || content_type.contains("audio/")
        {
            // Handle binary content types
            let encoded_data = base64::engine::general_purpose::STANDARD.encode(body_bytes);
            (Value::String(encoded_data), Value::Null)
        } else {
            // Default fallback for unknown content types
            let body_string = String::from_utf8_lossy(body_bytes).to_string();
            (Value::String(body_string), Value::Null)
        }
    }

    /// Парсит multipart/form-data
    async fn parse_multipart_data(
        body_bytes: &axum::body::Bytes,
        content_type: &str,
    ) -> MultipartResult {
        // Extract boundary from content-type
        let boundary = content_type
            .split("boundary=")
            .nth(1)
            .ok_or("No boundary found in content-type")?;

        // Create stream for multer
        let stream = stream::once(async move {
            Result::<axum::body::Bytes, std::io::Error>::Ok(body_bytes.clone())
        });

        // Create Multipart
        let mut multipart = Multipart::new(stream, boundary);

        let mut fields = HashMap::new();
        let mut files = HashMap::new();

        // Process all fields and files
        while let Some(field) = multipart.next_field().await? {
            let field_name = field.name().unwrap_or("unknown").to_string();

            if let Some(filename) = field.file_name() {
                // This is a file
                let filename = filename.to_string();
                let content_type = field
                    .content_type()
                    .map(|ct| ct.to_string())
                    .unwrap_or_else(|| "application/octet-stream".to_string());

                let data = field.bytes().await?;
                let size = data.len();

                // Encode file data as base64
                let encoded_data = base64::engine::general_purpose::STANDARD.encode(&data);

                let file_info = FileInfo {
                    filename,
                    content_type,
                    size,
                    data: encoded_data,
                };

                files.insert(field_name, file_info);
            } else {
                // This is a regular form field
                let value = field.text().await?;
                fields.insert(field_name, value);
            }
        }

        Ok((fields, files))
    }
}
