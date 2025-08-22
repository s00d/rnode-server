use crate::types::{
    DownloadRouteConfig, UploadRouteConfig, get_download_routes, get_upload_routes,
};
use base64::Engine;
use infer;
use mime_guess::MimeGuess;
use neon::prelude::*;
use serde_json;
use std::fs;
use std::path::Path;

// Structure for file information
#[derive(Debug, serde::Serialize)]
struct FileInfo {
    name: String,
    size: u64,
    created: String,
    modified: String,
    mime_type: String,
    path: String,
    relative_path: String,
}

// Function for saving file
pub fn save_file(mut cx: FunctionContext) -> JsResult<JsString> {
    let filename = cx.argument::<JsString>(0)?.value(&mut cx);
    let base64_data = cx.argument::<JsString>(1)?.value(&mut cx);
    let uploads_dir = cx.argument::<JsString>(2)?.value(&mut cx);

    // Create uploads folder if it doesn't exist
    if !Path::new(&uploads_dir).exists() {
        if let Err(e) = fs::create_dir_all(&uploads_dir) {
            return Ok(cx.string(format!(
                "{{\"success\":false,\"error\":\"Failed to create directory: {}\"}}",
                e
            )));
        }
    }

    let file_path = format!("{}/{}", uploads_dir, filename);

    // Decode Base64 and save file
    match base64::engine::general_purpose::STANDARD.decode(&base64_data) {
        Ok(file_data) => {
            match fs::write(&file_path, file_data) {
                Ok(_) => {
                    println!("💾 File saved: {}", file_path);
                    Ok(cx.string(format!("{{\"success\":true,\"message\":\"File saved successfully\",\"path\":\"{}\"}}", file_path)))
                }
                Err(e) => Ok(cx.string(format!(
                    "{{\"success\":false,\"error\":\"Failed to write file: {}\"}}",
                    e
                ))),
            }
        }
        Err(e) => Ok(cx.string(format!(
            "{{\"success\":false,\"error\":\"Failed to decode base64: {}\"}}",
            e
        ))),
    }
}

// Function for deleting file
pub fn delete_file(mut cx: FunctionContext) -> JsResult<JsString> {
    let filename = cx.argument::<JsString>(0)?.value(&mut cx);
    let uploads_dir = cx.argument::<JsString>(1)?.value(&mut cx);

    let file_path = format!("{}/{}", uploads_dir, filename);

    if Path::new(&file_path).exists() {
        match fs::remove_file(&file_path) {
            Ok(_) => {
                println!("🗑️ File deleted: {}", file_path);
                Ok(cx.string(format!(
                    "{{\"success\":true,\"message\":\"File {} deleted successfully\"}}",
                    filename
                )))
            }
            Err(e) => Ok(cx.string(format!(
                "{{\"success\":false,\"error\":\"Failed to delete file: {}\"}}",
                e
            ))),
        }
    } else {
        Ok(cx.string(format!(
            "{{\"success\":false,\"error\":\"File not found\"}}"
        )))
    }
}

// Function for getting list of files with subfolders
pub fn list_files(mut cx: FunctionContext) -> JsResult<JsString> {
    let uploads_dir = cx.argument::<JsString>(0)?.value(&mut cx);

    if !Path::new(&uploads_dir).exists() {
        return Ok(cx.string("{\"success\":true,\"files\":[],\"folders\":[],\"total\":0}"));
    }

    // Recursive function for traversing directories
    fn scan_directory(dir_path: &Path, base_dir: &Path) -> Result<Vec<FileInfo>, std::io::Error> {
        let mut files = Vec::new();

        if let Ok(entries) = fs::read_dir(dir_path) {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();

                    if path.is_file() {
                        if let Ok(metadata) = fs::metadata(&path) {
                            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                                // Calculate relative path from base directory
                                let relative_path =
                                    if let Ok(rel_path) = path.strip_prefix(base_dir) {
                                        rel_path.to_string_lossy().to_string()
                                    } else {
                                        name.to_string()
                                    };

                                let file_info = FileInfo {
                                    name: name.to_string(),
                                    size: metadata.len(),
                                    created: {
                                        let created_time = metadata
                                            .created()
                                            .unwrap_or_else(|_| std::time::SystemTime::now());
                                        let duration = created_time
                                            .duration_since(std::time::UNIX_EPOCH)
                                            .unwrap_or_default();
                                        (duration.as_secs() * 1000
                                            + duration.subsec_millis() as u64)
                                            .to_string()
                                    },
                                    modified: {
                                        let modified_time = metadata
                                            .modified()
                                            .unwrap_or_else(|_| std::time::SystemTime::now());
                                        let duration = modified_time
                                            .duration_since(std::time::UNIX_EPOCH)
                                            .unwrap_or_default();
                                        (duration.as_secs() * 1000
                                            + duration.subsec_millis() as u64)
                                            .to_string()
                                    },
                                    mime_type: MimeGuess::from_path(&path)
                                        .first_or_octet_stream()
                                        .to_string(),
                                    path: relative_path.clone(),
                                    relative_path: relative_path.clone(),
                                };
                                files.push(file_info);
                            }
                        }
                    } else if path.is_dir() {
                        // Recursively traverse subfolders
                        if let Ok(sub_files) = scan_directory(&path, base_dir) {
                            files.extend(sub_files);
                        }
                    }
                }
            }
        }

        Ok(files)
    }

    match scan_directory(Path::new(&uploads_dir), Path::new(&uploads_dir)) {
        Ok(files) => {
            let result = serde_json::json!({
                "success": true,
                "files": files.iter().map(|f| {
                    serde_json::json!({
                        "name": f.name,
                        "size": f.size,
                        "created": f.created,
                        "modified": f.modified,
                        "mime_type": f.mime_type,
                        "path": f.path,
                        "relative_path": f.relative_path
                    })
                }).collect::<Vec<_>>(),
                "total": files.len()
            });

            Ok(cx.string(result.to_string()))
        }
        Err(e) => Ok(cx.string(format!(
            "{{\"success\":false,\"error\":\"Failed to scan directory: {}\"}}",
            e
        ))),
    }
}

// Function for getting file content
pub fn get_file_content(mut cx: FunctionContext) -> JsResult<JsString> {
    let filename = cx.argument::<JsString>(0)?.value(&mut cx);
    let uploads_dir = cx.argument::<JsString>(1)?.value(&mut cx);

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

                Ok(cx.string(result.to_string()))
            }
            Err(e) => Ok(cx.string(format!(
                "{{\"success\":false,\"error\":\"Failed to read file: {}\"}}",
                e
            ))),
        }
    } else {
        Ok(cx.string("{\"success\":false,\"error\":\"File not found\"}"))
    }
}

// Function for checking file existence
pub fn file_exists(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let filename = cx.argument::<JsString>(0)?.value(&mut cx);
    let uploads_dir = cx.argument::<JsString>(1)?.value(&mut cx);

    let file_path = format!("{}/{}", uploads_dir, filename);
    let exists = Path::new(&file_path).exists();

    Ok(cx.boolean(exists))
}

// Function for downloading file
pub fn download_file(mut cx: FunctionContext) -> JsResult<JsString> {
    let filename = cx.argument::<JsString>(0)?.value(&mut cx);
    let uploads_dir = cx.argument::<JsString>(1)?.value(&mut cx);

    let file_path = format!("{}/{}", uploads_dir, filename);

    if Path::new(&file_path).exists() {
        match fs::read(&file_path) {
            Ok(content) => {
                // Return file content as base64 string
                let base64_content = base64::engine::general_purpose::STANDARD.encode(&content);
                Ok(cx.string(base64_content))
            }
            Err(_) => Ok(cx.string("")),
        }
    } else {
        Ok(cx.string(""))
    }
}

// Function for registering file download route
pub fn register_download_route(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let path = cx.argument::<JsString>(0)?.value(&mut cx);
    let options_json = cx.argument::<JsString>(1)?.value(&mut cx);

    // Parse options
    if let Ok(options) = serde_json::from_str::<serde_json::Value>(&options_json) {
        let folder = options["folder"]
            .as_str()
            .unwrap_or("./uploads")
            .to_string();
        let max_file_size = options["maxFileSize"].as_u64();

        // Parse arrays
        let allowed_extensions = options["allowedExtensions"].as_array().map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .map(|s| s.to_string())
                .collect::<Vec<String>>()
        });

        let blocked_paths = options["blockedPaths"].as_array().map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .map(|s| s.to_string())
                .collect::<Vec<String>>()
        });

        let allow_hidden = options["allowHiddenFiles"].as_bool().unwrap_or(false);
        let allow_system = options["allowSystemFiles"].as_bool().unwrap_or(false);

        // Create configuration
        let config = DownloadRouteConfig {
            path: path.clone(),
            folder: folder.clone(),
            max_file_size,
            allowed_extensions: allowed_extensions.clone(),
            blocked_paths: blocked_paths.clone(),
            allow_hidden_files: allow_hidden,
            allow_system_files: allow_system,
        };

        // Save to global storage
        let download_routes = get_download_routes();
        download_routes
            .write()
            .unwrap()
            .insert(path.clone(), config);

        println!("📥 Registering download route: {} -> {}", path, folder);
        println!("   Max size: {:?} bytes", max_file_size);
        println!("   Allowed extensions: {:?}", allowed_extensions);
        println!("   Blocked paths: {:?}", blocked_paths);
        println!("   Allow hidden files: {}", allow_hidden);
        println!("   Allow system files: {}", allow_system);

        // Show current registered routes
        let routes = download_routes.read().unwrap();
        println!(
            "📋 Total download routes registered: {}",
            routes.len()
        );
        for (route_path, _) in routes.iter() {
            println!("   - {}", route_path);
        }
    }

    Ok(cx.undefined())
}

// Function for registering file upload route (single or multiple)
pub fn register_upload_route(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let path = cx.argument::<JsString>(0)?.value(&mut cx);
    let options_json = cx.argument::<JsString>(1)?.value(&mut cx);

    // Parse options
    if let Ok(options) = serde_json::from_str::<serde_json::Value>(&options_json) {
        let folder = options["folder"]
            .as_str()
            .unwrap_or("./uploads")
            .to_string();
        let allowed_subfolders = options["allowedSubfolders"].as_array().map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .map(|s| s.to_string())
                .collect::<Vec<String>>()
        });
        let max_file_size = options["maxFileSize"].as_u64();

        // Parse arrays
        let allowed_extensions = options["allowedExtensions"].as_array().map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .map(|s| s.to_string())
                .collect::<Vec<String>>()
        });

        let allowed_mime_types = options["allowedMimeTypes"].as_array().map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .map(|s| s.to_string())
                .collect::<Vec<String>>()
        });

        let max_files = options["maxFiles"].as_u64().map(|v| v as u32);
        let overwrite = options["overwrite"].as_bool().unwrap_or(false);
        let multiple = options["multiple"].as_bool().unwrap_or(false);

        // Create configuration for file uploads
        let config = UploadRouteConfig {
            path: path.clone(),
            folder: folder.clone(),
            allowed_subfolders: allowed_subfolders.clone(),
            max_file_size,
            allowed_extensions: allowed_extensions.clone(),
            allowed_mime_types: allowed_mime_types.clone(),
            multiple,
            max_files,
            overwrite,
        };

        // Save to global storage
        let upload_routes = get_upload_routes();
        upload_routes.write().unwrap().insert(path.clone(), config);

        println!("📤 Registering upload route: {} -> {}", path, folder);
        println!("   Allowed subfolders: {:?}", allowed_subfolders);
        println!("   Max size: {:?} bytes", max_file_size);
        println!("   Allowed extensions: {:?}", allowed_extensions);
        println!("   Allowed MIME types: {:?}", allowed_mime_types);
        println!("   Max file count: {:?}", max_files);
        println!("   Allow overwrite: {}", overwrite);
        println!("   Multiple upload: {}", multiple);

        // Show current registered routes
        let routes = upload_routes.read().unwrap();
        println!(
            "📋 Total upload routes registered: {}",
            routes.len()
        );
        for (route_path, _) in routes.iter() {
            println!("   - {}", route_path);
        }
    }

    Ok(cx.undefined())
}
