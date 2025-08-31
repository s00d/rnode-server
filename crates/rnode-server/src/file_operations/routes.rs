use crate::types::{DownloadRouteConfig, UploadRouteConfig, get_download_routes, get_upload_routes};
use log::{debug, info};
use neon::prelude::*;
use serde_json;

// Function for registering file download route implementation
pub fn register_download_route_impl<'a>(
    path: &str,
    options_json: &str,
    mut _cx: FunctionContext<'a>,
) -> JsResult<'a, JsUndefined> {
    // Parse options
    if let Ok(options) = serde_json::from_str::<serde_json::Value>(options_json) {
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
            path: path.to_string(),
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
            .insert(path.to_string(), config);

        info!("📥 Registering download route: {} -> {}", path, folder);
        debug!("   Max size: {:?} bytes", max_file_size);
        debug!("   Allowed extensions: {:?}", allowed_extensions);
        debug!("   Blocked paths: {:?}", blocked_paths);
        debug!("   Allow hidden files: {}", allow_hidden);
        debug!("   Allow system files: {}", allow_system);

        // Show current registered routes
        let routes = download_routes.read().unwrap();
        info!("📋 Total download routes registered: {}", routes.len());
        for (route_path, _) in routes.iter() {
            debug!("   - {}", route_path);
        }
    }

    Ok(_cx.undefined())
}

// Function for registering file upload route implementation
pub fn register_upload_route_impl<'a>(
    path: &str,
    options_json: &str,
    mut _cx: FunctionContext<'a>,
) -> JsResult<'a, JsUndefined> {
    // Parse options
    if let Ok(options) = serde_json::from_str::<serde_json::Value>(options_json) {
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
            path: path.to_string(),
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
        upload_routes.write().unwrap().insert(path.to_string(), config);

        info!("📤 Registering upload route: {} -> {}", path, folder);
        debug!("   Allowed subfolders: {:?}", allowed_subfolders);
        debug!("   Max size: {:?} bytes", max_file_size);
        debug!("   Allowed extensions: {:?}", allowed_extensions);
        debug!("   Allowed MIME types: {:?}", allowed_mime_types);
        debug!("   Max file count: {:?}", max_files);
        debug!("   Allow overwrite: {}", overwrite);
        debug!("   Multiple upload: {}", multiple);

        // Show current registered routes
        let routes = upload_routes.read().unwrap();
        info!("📋 Total upload routes registered: {}", routes.len());
        for (route_path, _) in routes.iter() {
            debug!("   - {}", route_path);
        }
    }

    Ok(_cx.undefined())
}
