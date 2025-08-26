use crate::handlers::dynamic_handler;
use crate::metrics::{init_metrics, render_metrics, track_metrics, update_system_metrics};
use crate::static_files::handle_static_file;
use crate::types::{get_download_routes, get_event_queue, get_routes, get_upload_routes};
use axum::{
    Router,
    routing::{delete, get, options, patch, post, put},
};
use futures::stream::{self};
use mime_guess::MimeGuess;
use multer::Multipart;
use neon::prelude::*;

use axum_server::tls_rustls::RustlsConfig;
use globset::{Glob, GlobSetBuilder};
use log::{debug, error, info, warn};
use serde_json;
use std::net::SocketAddr;

// Structure for SSL/TLS configuration
#[derive(Debug)]
pub struct SslConfig {
    pub cert_file: Option<String>,
    pub key_file: Option<String>,
}

impl SslConfig {
    pub fn from_files(cert_path: &str, key_path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        Ok(SslConfig {
            cert_file: Some(cert_path.to_string()),
            key_file: Some(key_path.to_string()),
        })
    }
}

// Function for starting the server
pub fn start_listen(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let port = cx.argument::<JsNumber>(0)?.value(&mut cx) as u16;

    // Get host argument (required)
    let host = {
        let host_arg = cx.argument::<JsString>(1)?;
        let host_str = host_arg.value(&mut cx);
        // Parse IP address
        let ip_parts: Result<Vec<u8>, _> =
            host_str.split('.').map(|part| part.parse::<u8>()).collect();

        match ip_parts {
            Ok(parts) if parts.len() == 4 => [parts[0], parts[1], parts[2], parts[3]],
            _ => {
                warn!("Invalid IP address: {}, using localhost", host_str);
                [127, 0, 0, 1]
            }
        }
    };

    // Get options object (third argument)
    let app_options = if cx.len() > 2 {
        if let Ok(options_arg) = cx.argument::<JsValue>(2) {
            if let Ok(options_obj) = options_arg.downcast::<JsObject, _>(&mut cx) {
                let ssl_config = options_obj
                    .get::<JsValue, _, _>(&mut cx, "ssl")
                    .ok()
                    .and_then(|ssl_obj| ssl_obj.downcast::<JsObject, _>(&mut cx).ok())
                    .and_then(|ssl_obj| {
                        let cert_path = ssl_obj.get::<JsValue, _, _>(&mut cx, "certPath").ok()?;
                        let key_path = ssl_obj.get::<JsValue, _, _>(&mut cx, "keyPath").ok()?;

                        let cert_str = cert_path
                            .downcast::<JsString, _>(&mut cx)
                            .ok()?
                            .value(&mut cx);
                        let key_str = key_path
                            .downcast::<JsString, _>(&mut cx)
                            .ok()?
                            .value(&mut cx);

                        match SslConfig::from_files(&cert_str, &key_str) {
                            Ok(config) => {
                                info!(
                                    "🔒 SSL enabled with certificate: {} and key: {}",
                                    cert_str, key_str
                                );
                                Some(config)
                            }
                            Err(e) => {
                                error!("❌ Failed to load SSL certificate: {}, using HTTP only", e);
                                None
                            }
                        }
                    });

                let metrics_enabled = options_obj
                    .get::<JsValue, _, _>(&mut cx, "metrics")
                    .ok()
                    .and_then(|metrics_arg| metrics_arg.downcast::<JsBoolean, _>(&mut cx).ok())
                    .map(|metrics_bool| metrics_bool.value(&mut cx))
                    .unwrap_or(false);

                let timeout = options_obj
                    .get::<JsValue, _, _>(&mut cx, "timeout")
                    .ok()
                    .and_then(|timeout_arg| timeout_arg.downcast::<JsNumber, _>(&mut cx).ok())
                    .map(|timeout_num| timeout_num.value(&mut cx) as u64)
                    .unwrap_or(30000); // Default 30 seconds

                (ssl_config, metrics_enabled, timeout)
            } else {
                (None, false, 30000)
            }
        } else {
            (None, false, 30000)
        }
    } else {
        (None, false, 30000)
    };

    let (ssl_config, metrics_enabled, timeout) = app_options;
    info!(
        "🚀 Starting server on {}:{} {}",
        host.iter()
            .map(|b| b.to_string())
            .collect::<Vec<_>>()
            .join("."),
        port,
        if ssl_config.is_some() {
            "(HTTPS)"
        } else {
            "(HTTP)"
        }
    );

    // Create Channel for communication with JavaScript
    let queue = cx.channel();

    // Save Channel in global variable
    {
        let event_queue_guard = get_event_queue();
        let mut event_queue_map = event_queue_guard.write().unwrap();
        *event_queue_map = Some(queue);
    }

    // Start real HTTP server
    std::thread::spawn(move || {
        // let rt = tokio::runtime::Runtime::new().unwrap();
        let rt = tokio::runtime::Builder::new_multi_thread()
            .worker_threads(num_cpus::get()) // кол-во потоков = кол-во ядер
            .enable_all()
            .build()
            .unwrap();
        rt.block_on(async {
            // Create base router
            let mut app = Router::new();

            // Add dynamic routes
            let routes = get_routes();
            let routes_map = routes.read().unwrap();
            // Create clones for use in closures
            let routes_vec: Vec<(String, String, String)> = routes_map.iter()
                .map(|(_, route_info)| (route_info.path.clone(), route_info.method.clone(), route_info.handler_id.clone()))
                .collect();

            debug!("Routes found: {:?}", routes_vec);
            for (path, method, handler_id) in routes_vec {
                let path_clone = path.clone();
                let method_clone = method.clone();
                let handler_id_clone = handler_id.clone();
                let handler_fn = move |req: axum::extract::Request| {
                    let registered_path = path_clone.clone();
                    let method = method_clone.clone();
                    let handler_id = handler_id_clone.clone();
                    let timeout_clone = timeout;
                    async move {
                        // Get actual path from request
                        let actual_path = req.uri().path().to_string();
                        dynamic_handler(req, actual_path, registered_path, method, handler_id, timeout_clone).await
                    }
                };

                match method.as_str() {
                    "GET" => app = app.route(&path, get(handler_fn)),
                    "POST" => app = app.route(&path, post(handler_fn)),
                    "PUT" => app = app.route(&path, put(handler_fn)),
                    "DELETE" => app = app.route(&path, delete(handler_fn)),
                    "PATCH" => app = app.route(&path, patch(handler_fn)),
                    "OPTIONS" => app = app.route(&path, options(handler_fn)),
                    _ => {}
                }
            }

            let addr = SocketAddr::from(([127, 0, 0, 1], port));
            warn!("Server listening on http://{}", addr);
            debug!("Registered dynamic routes:");
            for (_, route_info) in routes_map.iter() {
                debug!("  {} {}", route_info.method, route_info.path);
            }

            // Release lock before starting server
            drop(routes_map);

            // Add dynamic routes for file downloads
            let download_routes = get_download_routes();
            let download_routes_map = download_routes.read().unwrap();

            for (route_path, config) in download_routes_map.iter() {
                let config_clone = config.clone();
                let route_path_clone = route_path.clone();

                let download_handler = move |req: axum::extract::Request| {
                    let config = config_clone.clone();
                    let route_path = route_path_clone.clone();
                    async move {
                        // Extract file path from {*name} parameter or from query parameter ?path=
                        let actual_filename = {
                            let mut result = None;

                            // First check {*name} parameter from path
                            if route_path.contains("{*name}") {
                                // Extract filename from URL
                                let path_parts: Vec<&str> = req.uri().path().split('/').collect();
                                if path_parts.len() >= 3 {
                                    let filename = path_parts[2..].join("/");
                                    if !filename.is_empty() {
                                        debug!("📁 File for download from {{*name}} parameter: '{}'", filename);
                                        result = Some(filename);
                                    }
                                }
                            }

                            // If filename not found in path, check query parameter ?path=
                            if result.is_none() {
                                if let Some(query) = req.uri().query() {
                                    let query_parts: Vec<&str> = query.split('&').collect();
                                    for part in query_parts {
                                        if part.starts_with("path=") {
                                            let path_value = &part[5..]; // Remove "path="
                                            if !path_value.is_empty() {
                                                // Decode URL-encoded values
                                                let decoded_value = match urlencoding::decode(path_value) {
                                                    Ok(decoded) => decoded.to_string(),
                                                    Err(_) => path_value.to_string(),
                                                };
                                                debug!("📁 File for download from query parameter ?path=: '{}'", decoded_value);
                                                result = Some(decoded_value);
                                                break;
                                            }
                                        }
                                    }
                                }
                            }

                            // If nothing found, return error
                            match result {
                                Some(filename) => filename,
                                None => {
                                    warn!("❌ File path for download not specified");
                                    return Err(http::StatusCode::BAD_REQUEST);
                                }
                            }
                        };

                        let file_path = format!("{}/{}", config.folder, actual_filename);

                        // Check if file exists
                        if !std::path::Path::new(&file_path).exists() {
                            return Err(http::StatusCode::NOT_FOUND);
                        }

                        // Check file size
                        if let Some(max_size) = config.max_file_size {
                            if let Ok(metadata) = std::fs::metadata(&file_path) {
                                if metadata.len() > max_size {
                                    return Err(http::StatusCode::PAYLOAD_TOO_LARGE);
                                }
                            }
                        }

                        // Check file extension
                        if let Some(ref allowed_extensions) = config.allowed_extensions {
                            if let Some(extension) = std::path::Path::new(&actual_filename).extension() {
                                let ext_str = extension.to_string_lossy().to_lowercase();
                                if !allowed_extensions.iter().any(|allowed| {
                                    allowed.trim_start_matches('.').to_lowercase() == ext_str
                                }) {
                                    return Err(http::StatusCode::FORBIDDEN);
                                }
                            }
                        }

                        // Check blocked paths
                        if let Some(ref blocked_paths) = config.blocked_paths {
                            for blocked_path in blocked_paths {
                                if actual_filename.contains(blocked_path) {
                                    return Err(http::StatusCode::FORBIDDEN);
                                }
                            }
                        }

                        // Check hidden and system files
                        if !config.allow_hidden_files {
                            if actual_filename.starts_with('.') {
                                return Err(http::StatusCode::FORBIDDEN);
                            }
                        }

                        if !config.allow_system_files {
                            let system_files = ["thumbs.db", ".ds_store", "desktop.ini"];
                            if system_files.iter().any(|&sys_file| {
                                actual_filename.to_lowercase() == sys_file.to_lowercase()
                            }) {
                                return Err(http::StatusCode::FORBIDDEN);
                            }
                        }

                        // Open file for reading
                        if let Ok(file) = tokio::fs::File::open(&file_path).await {
                            let metadata = file.metadata().await.unwrap_or_else(|_| std::fs::metadata(&file_path).unwrap());

                            // Determine MIME type
                            let mime_type = if let Some(kind) = infer::get(&std::fs::read(&file_path).unwrap_or_default()) {
                                kind.mime_type().to_string()
                            } else {
                                MimeGuess::from_path(&file_path).first_or_octet_stream().to_string()
                            };

                            let stream = tokio_util::io::ReaderStream::new(file);
                            let body = axum::body::Body::from_stream(stream);

                            let mut response = axum::response::Response::new(body);
                            response.headers_mut().insert("content-type", mime_type.parse().unwrap());
                            response.headers_mut().insert("content-disposition", format!("attachment; filename=\"{}\"", actual_filename).parse().unwrap());
                            response.headers_mut().insert("content-length", metadata.len().to_string().parse().unwrap());

                            // Custom headers not supported yet

                            Ok(response)
                        } else {
                            Err(http::StatusCode::NOT_FOUND)
                        }
                    }
                };

                // Register route (support wildcard for subfolders)
                let actual_route = route_path.clone();
                app = app.route(&actual_route, get(download_handler));
                info!("📥 Download route registered: {} -> {}", route_path, actual_route);
            }

            // Release lock
            drop(download_routes_map);

            // Add routes for file uploads
            let upload_routes = get_upload_routes();
            let upload_routes_map = upload_routes.read().unwrap();

            for (route_path, config) in upload_routes_map.iter() {
                let config_clone = config.clone();
                let route_path_clone = route_path.clone();

                let upload_handler = move |req: axum::extract::Request| {
                    let config = config_clone.clone();
                    let route_path = route_path_clone.clone();
                    async move {
                        info!("📤 File upload via route: {}", route_path);

                        // Function for checking wildcard pattern
                        fn matches_pattern(pattern: &str, path: &str) -> bool {
                            if pattern == path {
                                return true; // Exact match
                            }

                            // Use globset for flexible wildcard matching
                            if let Ok(glob) = Glob::new(pattern) {
                                let mut builder = GlobSetBuilder::new();
                                builder.add(glob);
                                if let Ok(globset) = builder.build() {
                                    return globset.is_match(path);
                                }
                            }

                            // Fallback to simple string comparison if glob parsing fails
                            false
                        }

                        // Extract subfolder from {*subfolder} parameter or from query parameter ?dir=
                        let subfolder_from_url = {
                            let mut result = None;

                            // First check {*subfolder} parameter from path
                            if route_path.contains("{*subfolder}") {
                                // Extract subfolder from actual request URL
                                let request_path = req.uri().path();
                                let path_parts: Vec<&str> = request_path.split('/').collect();

                                // If path contains /upload/ or /upload-multiple/, extract subfolder
                                if (request_path.starts_with("/upload/") || request_path.starts_with("/upload-multiple/")) && path_parts.len() >= 3 {
                                    let subfolder = path_parts[2..].join("/");
                                    if !subfolder.is_empty() {
                                        debug!("📁 Subfolder from {{*subfolder}} parameter: '{}'", subfolder);
                                        result = Some(subfolder);
                                    }
                                }
                            }

                            // If subfolder not found in path, check query parameter ?dir=
                            if result.is_none() {
                                if let Some(query) = req.uri().query() {
                                    // Parse query parameters
                                    let query_parts: Vec<&str> = query.split('&').collect();
                                    for part in query_parts {
                                        if part.starts_with("dir=") {
                                            let dir_value = &part[4..]; // Remove "dir="
                                            if !dir_value.is_empty() {
                                                // Decode URL-encoded values
                                                let decoded_value = match urlencoding::decode(dir_value) {
                                                    Ok(decoded) => decoded.to_string(),
                                                    Err(_) => dir_value.to_string(),
                                                };
                                                debug!("📁 Subfolder from query parameter: '{}' (decoded: '{}')", dir_value, decoded_value);
                                                result = Some(decoded_value);
                                                break;
                                            }
                                        }
                                    }
                                }
                            }

                            result
                        };

                        // Get Content-Type to determine boundary
                        let content_type = req.headers()
                            .get("content-type")
                            .and_then(|h| h.to_str().ok())
                            .unwrap_or("")
                            .to_string();

                        if !content_type.contains("multipart/form-data") {
                            return axum::response::Response::builder()
                                .status(http::StatusCode::BAD_REQUEST)
                                .body(axum::body::Body::from("Content-Type must be multipart/form-data"))
                                .unwrap();
                        }

                        // Extract boundary
                        let boundary = content_type
                            .split("boundary=")
                            .nth(1)
                            .unwrap_or("boundary");

                        // Get body
                        let body_bytes = match axum::body::to_bytes(req.into_body(), usize::MAX).await {
                            Ok(bytes) => bytes,
                            Err(_) => {
                                return axum::response::Response::builder()
                                    .status(http::StatusCode::BAD_REQUEST)
                                    .body(axum::body::Body::from("Failed to read request body"))
                                    .unwrap();
                            }
                        };

                        // Create stream for multer
                        let stream = stream::once(async move {
                            Result::<axum::body::Bytes, std::io::Error>::Ok(body_bytes)
                        });

                        // Create Multipart
                        let mut multipart = Multipart::new(stream, boundary);

                        let mut uploaded_files = Vec::new();
                        let mut form_fields = std::collections::HashMap::new();
                        // Use subfolder from query parameter
                        let subfolder_from_form = subfolder_from_url;

                        // Structure for file information
                        #[derive(serde::Serialize)]
                        struct FileInfo {
                            name: String,
                            size: u64,
                            mime_type: String,
                            relative_path: String,
                        }

                        // Process all fields and files in one loop
                        loop {
                            match multipart.next_field().await {
                                Ok(Some(field)) => {
                                    let field_name = field.name().unwrap_or("unknown").to_string();

                                    if let Some(filename) = field.file_name() {
                                        // This is a file - process immediately
                                        let filename = filename.to_string();
                                        debug!("📄 Processing file: '{}'", filename);

                                        // Check if subfolder is allowed
                                        let upload_folder = if let Some(ref subfolder) = subfolder_from_form {
                                            debug!("📁 Using subfolder from query parameter: '{}'", subfolder);
                                            // Check if subfolder is allowed with wildcard support
                                            if let Some(ref allowed_subfolders) = config.allowed_subfolders {
                                                debug!("📁 Checking allowed subfolders: {:?}", allowed_subfolders);

                                                let is_allowed = allowed_subfolders.iter().any(|allowed| {
                                                    matches_pattern(allowed, subfolder)
                                                });

                                                if !is_allowed {
                                                    warn!("❌ Subfolder '{}' not allowed", subfolder);
                                                    return axum::response::Response::builder()
                                                        .status(http::StatusCode::FORBIDDEN)
                                                        .body(axum::body::Body::from(format!("Subfolder '{}' not allowed", subfolder)))
                                                        .unwrap();
                                                }
                                                debug!("✅ Subfolder '{}' allowed", subfolder);
                                            }
                                            let folder = format!("{}/{}", config.folder, subfolder);
                                            debug!("📁 Full upload folder: '{}'", folder);
                                            folder
                                        } else {
                                            debug!("📁 Subfolder not specified, using root: '{}'", config.folder);
                                            config.folder.clone()
                                        };

                                        // Create relative file path
                                        let relative_path = if let Some(ref subfolder) = subfolder_from_form {
                                            let path = format!("{}/{}", subfolder, filename);
                                            debug!("📁 Relative file path: '{}'", path);
                                            path
                                        } else {
                                            debug!("📁 Relative path (no subfolder): '{}'", filename);
                                            filename.clone()
                                        };

                                        // Check extension
                                        if let Some(ref allowed_extensions) = config.allowed_extensions {
                                            if let Some(extension) = std::path::Path::new(&filename).extension() {
                                                let ext_str = extension.to_string_lossy().to_lowercase();
                                                if !allowed_extensions.iter().any(|allowed| {
                                                    allowed.trim_start_matches('.').to_lowercase() == ext_str
                                                }) {
                                                    warn!("❌ File extension .{} not allowed", ext_str);
                                                    return axum::response::Response::builder()
                                                        .status(http::StatusCode::FORBIDDEN)
                                                        .body(axum::body::Body::from(format!("File extension .{} not allowed", ext_str)))
                                                        .unwrap();
                                                }
                                            }
                                        }

                                        // Determine MIME type via mime_guess
                                        let mime_type = MimeGuess::from_path(&filename)
                                            .first_or_octet_stream()
                                            .to_string();

                                        // Check MIME type for security
                                        if let Some(ref allowed_mime_types) = config.allowed_mime_types {
                                            if !allowed_mime_types.contains(&mime_type) {
                                                warn!("❌ MIME type {} not allowed", mime_type);
                                                return axum::response::Response::builder()
                                                    .status(http::StatusCode::FORBIDDEN)
                                                    .body(axum::body::Body::from(format!("MIME type {} not allowed", mime_type)))
                                                    .unwrap();
                                            }
                                        }

                                        // Read file content
                                        let data = match field.bytes().await {
                                            Ok(data) => data,
                                            Err(_) => {
                                                return axum::response::Response::builder()
                                                    .status(http::StatusCode::BAD_REQUEST)
                                                    .body(axum::body::Body::from("Failed to read file data"))
                                                    .unwrap();
                                            }
                                        };

                                        // Check file size
                                        if let Some(max_size) = config.max_file_size {
                                            if data.len() as u64 > max_size {
                                                warn!("❌ File size {} exceeds limit {}", data.len(), max_size);
                                                return axum::response::Response::builder()
                                                    .status(http::StatusCode::PAYLOAD_TOO_LARGE)
                                                    .body(axum::body::Body::from(format!("File size {} exceeds limit {}", data.len(), max_size)))
                                                    .unwrap();
                                            }
                                        }

                                        // Check overwrite
                                        let file_path = format!("{}/{}", upload_folder, filename);
                                        if !config.overwrite && std::path::Path::new(&file_path).exists() {
                                            warn!("❌ File {} already exists", relative_path);
                                            return axum::response::Response::builder()
                                                .status(http::StatusCode::CONFLICT)
                                                .body(axum::body::Body::from(format!("File {} already exists", relative_path)))
                                                .unwrap();
                                        }

                                        // Create folder if it doesn't exist
                                        debug!("📁 Creating folder: '{}'", upload_folder);
                                        if let Err(e) = std::fs::create_dir_all(&upload_folder) {
                                            error!("❌ Error creating folder '{}': {}", upload_folder, e);
                                            return axum::response::Response::builder()
                                                .status(http::StatusCode::INTERNAL_SERVER_ERROR)
                                                .body(axum::body::Body::from(format!("Failed to create upload directory: {}", e)))
                                                .unwrap();
                                        }
                                        debug!("✅ Folder created successfully: '{}'", upload_folder);

                                        // Save file
                                        debug!("💾 Saving file to: '{}'", file_path);
                                        if let Err(e) = std::fs::write(&file_path, &data) {
                                            error!("❌ Error saving file '{}': {}", file_path, e);
                                            return axum::response::Response::builder()
                                                .status(http::StatusCode::INTERNAL_SERVER_ERROR)
                                                .body(axum::body::Body::from(format!("Failed to save file: {}", e)))
                                                .unwrap();
                                        }
                                        debug!("✅ File saved successfully: '{}'", file_path);

                                        // Check file count based on upload type
                                        if config.multiple {
                                            // For multiple uploads check maxFiles
                                            if let Some(max_files) = config.max_files {
                                                if uploaded_files.len() >= max_files as usize {
                                                    warn!("❌ Maximum number of files ({}) exceeded", max_files);
                                                    return axum::response::Response::builder()
                                                        .status(http::StatusCode::PAYLOAD_TOO_LARGE)
                                                        .body(axum::body::Body::from(format!("Maximum number of files ({}) exceeded", max_files)))
                                                        .unwrap();
                                                }
                                            }
                                        } else {
                                            // For single upload allow only 1 file
                                            if uploaded_files.len() >= 1 {
                                                warn!("❌ Single file upload route received multiple files");
                                                return axum::response::Response::builder()
                                                    .status(http::StatusCode::BAD_REQUEST)
                                                    .body(axum::body::Body::from("Single file upload route received multiple files"))
                                                    .unwrap();
                                            }
                                        }

                                        // Create file information
                                        let file_info = FileInfo {
                                            name: filename.clone(),
                                            size: data.len() as u64,
                                            mime_type: mime_type.clone(),
                                            relative_path,
                                        };

                                        uploaded_files.push(file_info);
                                        debug!("💾 File saved: {} ({} bytes, {})", file_path, data.len(), mime_type);
                                    } else {
                                        // This is a regular form field
                                        let value = field.text().await.unwrap_or_else(|_| String::new());
                                        debug!("📝 Form field: '{}' = '{}'", field_name, value);
                                        form_fields.insert(field_name, value);
                                    }
                                }
                                Ok(None) => break, // End of multipart data
                                Err(_) => break, // Parsing error
                            }
                        }

                        // Form response
                        let response = serde_json::json!({
                            "success": true,
                            "message": "File uploaded successfully",
                            "uploadedFiles": uploaded_files,
                            "formFields": form_fields,
                            "totalFiles": uploaded_files.len()
                        });

                        axum::response::Response::builder()
                            .status(http::StatusCode::OK)
                            .header("content-type", "application/json")
                            .body(axum::body::Body::from(response.to_string()))
                            .unwrap()
                    }
                };

                // Register route
                app = app.route(route_path, post(upload_handler));
                info!("📤 Upload route registered: {}", route_path);
            }

            // Release lock
            drop(upload_routes_map);

            // Add fallback route for static files and non-existent routes
            let mut app = app.fallback(|req: http::Request<axum::body::Body>| async move {
                let path = req.uri().path().to_string();

                // First try to find static file
                let accept_encoding = req.headers().get("accept-encoding").and_then(|h| h.to_str().ok());
                if let Some(static_response) = handle_static_file(path, accept_encoding).await {
                    return static_response;
                }

                // If static file not found, return 404
                axum::response::Response::builder()
                    .status(http::StatusCode::NOT_FOUND)
                    .body(axum::body::Body::from("Not Found"))
                    .unwrap()
            });


            // Add metrics if enabled
            if metrics_enabled {
                // Initialize metrics
                init_metrics();

                // Add middleware to track HTTP metrics
                app = app.route_layer(axum::middleware::from_fn(track_metrics));

                // Start background task to update metrics periodically
                tokio::spawn(async move {
                    let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(5));
                    loop {
                        interval.tick().await;
                        update_system_metrics();
                    }
                });

                // Add /metrics endpoint
                app = app.route("/metrics", get(|| async {
                    render_metrics()
                }));

                // Add /health endpoint
                app = app.route("/health", get(|| async {
                    "OK"
                }));

                // Add /info endpoint with process information
                app = app.route("/info", get(|| async {
                    "Use /metrics endpoint for detailed system information"
                }));
                info!("📊 Metrics routes added: /metrics, /health, /info");
            } else {
                info!("📊 Metrics disabled");
            }

            // Start server based on SSL configuration
            if let Some(ssl_config) = &ssl_config {
                // Start HTTPS server using axum-server
                let cert_path = ssl_config.cert_file.as_ref().unwrap();
                let key_path = ssl_config.key_file.as_ref().unwrap();

                match RustlsConfig::from_pem_file(cert_path, key_path).await {
                    Ok(tls_config) => {
                        info!("🔒 Starting HTTPS server with TLS configuration");
                        warn!("🔒 HTTPS server listening on https://{}", addr);

                        // Use axum-server with TLS
                        axum_server::bind_rustls(addr, tls_config)
                            .serve(app.into_make_service())
                            .await
                            .unwrap();
                    }
                    Err(e) => {
                        error!("❌ Failed to create HTTPS configuration: {}", e);
                        warn!("🔄 Falling back to HTTP server");
                        // Fallback to HTTP
                        let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
                        warn!("🌐 HTTP server listening on http://{}", addr);
                        axum::serve(listener, app).await.unwrap();
                    }
                }
            } else {
                // Start HTTP server
                let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
                warn!("🌐 HTTP server listening on http://{}", addr);
                axum::serve(listener, app).await.unwrap();
            }
        });
    });

    // Give server time to start
    std::thread::sleep(std::time::Duration::from_millis(100));

    Ok(cx.undefined())
}
