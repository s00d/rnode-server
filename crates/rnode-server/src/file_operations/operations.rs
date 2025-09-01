use base64::Engine;
use infer;
use log::info;
use mime_guess::MimeGuess;

use serde_json;
use std::fs;
use std::path::{Path, PathBuf};

// Function for saving file implementation
pub fn save_file_impl(
    filename: &str,
    base64_data: &str,
    uploads_dir: &str,
) -> String {
    // Create uploads folder if it doesn't exist
    if !Path::new(uploads_dir).exists() {
        if let Err(e) = fs::create_dir_all(uploads_dir) {
            return format!(
                "{{\"success\":false,\"error\":\"Failed to create directory: {}\"}}",
                e
            );
        }
    }

    let file_path = format!("{}/{}", uploads_dir, filename);

    // Decode Base64 and save file
    match base64::engine::general_purpose::STANDARD.decode(base64_data) {
        Ok(file_data) => {
            match fs::write(&file_path, file_data) {
                Ok(_) => {
                    info!("💾 File saved: {}", file_path);
                    format!("{{\"success\":true,\"message\":\"File saved successfully\",\"path\":\"{}\"}}", file_path)
                }
                Err(e) => format!(
                    "{{\"success\":false,\"error\":\"Failed to write file: {}\"}}",
                    e
                ),
            }
        }
        Err(e) => format!(
            "{{\"success\":false,\"error\":\"Failed to decode base64: {}\"}}",
            e
        ),
    }
}

// ... existing code ...

// Helper function to recursively remove empty directories
fn remove_empty_directories(mut path: PathBuf) {
    while let Some(parent) = path.parent() {
        if path.is_dir() && path.read_dir().map(|mut d| d.next().is_none()).unwrap_or(false) {
            if let Err(e) = fs::remove_dir(&path) {
                info!("⚠️ Failed to remove empty directory {}: {}", path.display(), e);
                break;
            } else {
                info!("🗑️ Empty directory removed: {}", path.display());
            }
        } else {
            break;
        }
        path = parent.to_path_buf();
    }
}

// Function for deleting file implementation
pub fn delete_file_impl(
    filename: &str,
    uploads_dir: &str,
) -> String {
    let file_path = format!("{}/{}", uploads_dir, filename);
    let path = Path::new(&file_path);

    if path.exists() {
        // Get the parent directory path for cleanup
        let parent_dir = path.parent().map(|p| p.to_path_buf());
        
        match fs::remove_file(&file_path) {
            Ok(_) => {
                info!("🗑️ File deleted: {}", file_path);
                
                // Remove empty directories recursively
                if let Some(parent) = parent_dir {
                    remove_empty_directories(parent);
                }
                
                format!(
                    "{{\"success\":true,\"message\":\"File {} deleted successfully\"}}",
                    filename
                )
            }
            Err(e) => format!(
                "{{\"success\":false,\"error\":\"Failed to delete file: {}\"}}",
                e
            ),
        }
    } else {
        format!(
            "{{\"success\":false,\"error\":\"File not found\"}}"
        )
    }
}

// Function for getting file content implementation
pub fn get_file_content_impl(
    filename: &str,
    uploads_dir: &str,
) -> String {
    let file_path = format!("{}/{}", uploads_dir, filename);

    if Path::new(&file_path).exists() {
        match fs::read(&file_path) {
            Ok(content) => {
                // Encode to Base64 for transfer to JavaScript
                let base64_content = base64::engine::general_purpose::STANDARD.encode(&content);
                // Determine MIME type from file content
                let mime_type = if let Some(kind) = infer::get(&content) {
                    kind.mime_type().to_string()
                } else {
                    // Fallback to extension-based detection
                    MimeGuess::from_path(&file_path)
                        .first_or_octet_stream()
                        .to_string()
                };

                let result = serde_json::json!({
                    "success": true,
                    "content": base64_content,
                    "size": content.len(),
                    "filename": filename,
                    "mime_type": mime_type
                });

                result.to_string()
            }
            Err(e) => format!(
                "{{\"success\":false,\"error\":\"Failed to read file: {}\"}}",
                e
            ),
        }
    } else {
        "{\"success\":false,\"error\":\"File not found\"}".to_string()
    }
}

// Function for downloading file implementation
pub fn download_file_impl(
    filename: &str,
    uploads_dir: &str,
) -> String {
    let file_path = format!("{}/{}", uploads_dir, filename);

    if Path::new(&file_path).exists() {
        match fs::read(&file_path) {
            Ok(content) => {
                // Return file content as base64 string
                base64::engine::general_purpose::STANDARD.encode(&content)
            }
            Err(_) => "".to_string(),
        }
    } else {
        "".to_string()
    }
}
