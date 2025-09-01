use base64::Engine;
use futures::stream::{self};
use multer::Multipart;
use std::collections::HashMap;
use crate::request_parser::types::FileInfo;

// Structure for multipart parsing result
type MultipartResult =
    Result<(HashMap<String, String>, HashMap<String, FileInfo>), Box<dyn std::error::Error>>;

/// Парсит multipart/form-data
pub async fn parse_multipart_data(
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
