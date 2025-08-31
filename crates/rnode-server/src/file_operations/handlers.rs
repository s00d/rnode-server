use crate::html_templates;
use crate::types::{DownloadRouteConfig, UploadRouteConfig};
use axum::{body::Body, extract::Request, response::Response};
use futures::stream::{self};
use globset::{Glob, GlobSetBuilder};
use http;
use log::{debug, error, info, warn};
use mime_guess::MimeGuess;
use multer::Multipart;
use serde_json;
use std::collections::HashMap;
use std::path::Path;

// Structure for file information
#[derive(serde::Serialize)]
struct FileInfo {
    name: String,
    size: u64,
    mime_type: String,
    relative_path: String,
}

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

// Download handler implementation
pub async fn download_handler_impl(
    req: Request,
    config: DownloadRouteConfig,
    route_path: String,
) -> Result<Response<Body>, http::StatusCode> {
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
                    debug!(
                        "📁 File for download from {{*name}} parameter: '{}'",
                        filename
                    );
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
                            debug!(
                                "📁 File for download from query parameter ?path=: '{}'",
                                decoded_value
                            );
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
    if !Path::new(&file_path).exists() {
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
        if let Some(extension) = Path::new(&actual_filename).extension() {
            let ext_str = extension.to_string_lossy().to_lowercase();
            if !allowed_extensions
                .iter()
                .any(|allowed| allowed.trim_start_matches('.').to_lowercase() == ext_str)
            {
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
        if system_files
            .iter()
            .any(|&sys_file| actual_filename.to_lowercase() == sys_file.to_lowercase())
        {
            return Err(http::StatusCode::FORBIDDEN);
        }
    }

    // Open file for reading
    if let Ok(file) = tokio::fs::File::open(&file_path).await {
        let metadata = file
            .metadata()
            .await
            .unwrap_or_else(|_| std::fs::metadata(&file_path).unwrap());

        // Determine MIME type
        let mime_type =
            if let Some(kind) = infer::get(&std::fs::read(&file_path).unwrap_or_default()) {
                kind.mime_type().to_string()
            } else {
                MimeGuess::from_path(&file_path)
                    .first_or_octet_stream()
                    .to_string()
            };

        let stream = tokio_util::io::ReaderStream::new(file);
        let body = Body::from_stream(stream);

        let mut response = Response::new(body);
        response
            .headers_mut()
            .insert("content-type", mime_type.parse().unwrap());
        response.headers_mut().insert(
            "content-disposition",
            format!("attachment; filename=\"{}\"", actual_filename)
                .parse()
                .unwrap(),
        );
        response.headers_mut().insert(
            "content-length",
            metadata.len().to_string().parse().unwrap(),
        );

        Ok(response)
    } else {
        Err(http::StatusCode::NOT_FOUND)
    }
}

// Upload handler implementation
pub async fn upload_handler_impl(
    req: Request,
    config: UploadRouteConfig,
    route_path: String,
    dev_mode: bool,
) -> Result<Response<Body>, http::StatusCode> {
    info!("📤 File upload via route: {}", route_path);

    // Extract subfolder from {*subfolder} parameter or from query parameter ?dir=
    let subfolder_from_url = {
        let mut result = None;

        // First check {*subfolder} parameter from path
        if route_path.contains("{*subfolder}") {
            // Extract subfolder from actual request URL
            let request_path = req.uri().path();
            let path_parts: Vec<&str> = request_path.split('/').collect();

            // If path contains /upload/ or /upload-multiple/, extract subfolder
            if (request_path.starts_with("/upload/")
                || request_path.starts_with("/upload-multiple/"))
                && path_parts.len() >= 3
            {
                let subfolder = path_parts[2..].join("/");
                if !subfolder.is_empty() {
                    debug!(
                        "📁 Subfolder from {{*subfolder}} parameter: '{}'",
                        subfolder
                    );
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
                            debug!(
                                "📁 Subfolder from query parameter: '{}' (decoded: '{}')",
                                dir_value, decoded_value
                            );
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
    let content_type = req
        .headers()
        .get("content-type")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("")
        .to_string();

    debug!("📄 Content-Type: '{}'", content_type);

    if !content_type.contains("multipart/form-data") {
        warn!(
            "❌ Content-Type must be multipart/form-data, got: '{}'",
            content_type
        );
        return Ok(Response::builder()
            .status(http::StatusCode::BAD_REQUEST)
            .body(Body::from("Content-Type must be multipart/form-data"))
            .unwrap());
    }

    // Extract boundary
    let boundary = content_type.split("boundary=").nth(1).unwrap_or("boundary");

    debug!("📄 Boundary: '{}'", boundary);

    // Get body - try using req.into_body() directly
    debug!("📄 Reading request body...");
    let body = req.into_body();
    let body_bytes = axum::body::to_bytes(body, 100 * 1024 * 1024)
        .await
        .map_err(|e| {
            error!("❌ Failed to read request body: {:?}", e);
            http::StatusCode::BAD_REQUEST
        })?;

    debug!("📄 Body size: {} bytes", body_bytes.len());

    // Create stream for multer
    debug!("📄 Creating multipart stream...");
    let stream =
        stream::once(async move { Result::<axum::body::Bytes, std::io::Error>::Ok(body_bytes) });

    // Create Multipart
    debug!("📄 Creating multipart parser...");
    let mut multipart = Multipart::new(stream, boundary);

    let mut uploaded_files = Vec::new();
    let mut form_fields = HashMap::new();
    // Use subfolder from query parameter
    let subfolder_from_form = subfolder_from_url;

    debug!("📄 Starting to process multipart fields...");
    // Process all fields and files - use the same approach as request_parser.rs
    loop {
        match multipart.next_field().await {
            Ok(Some(field)) => {
                let field_name = field.name().unwrap_or("unknown").to_string();
                debug!("📄 Processing field: '{}'", field_name);

                if let Some(filename) = field.file_name() {
                    // This is a file - process immediately
                    let filename = filename.to_string();
                    debug!("📄 Processing file: '{}'", filename);

                    // Debug field information
                    debug!("📄 Field name: '{}'", field_name);
                    debug!("📄 Content type: '{:?}'", field.content_type());
                    debug!("📄 File name: '{}'", filename);

                    // Check if subfolder is allowed
                    let upload_folder = if let Some(ref subfolder) = subfolder_from_form {
                        debug!("📁 Using subfolder from query parameter: '{}'", subfolder);
                        // Check if subfolder is allowed with wildcard support
                        if let Some(ref allowed_subfolders) = config.allowed_subfolders {
                            debug!("📁 Checking allowed subfolders: {:?}", allowed_subfolders);

                            let is_allowed = allowed_subfolders
                                .iter()
                                .any(|allowed| matches_pattern(allowed, subfolder));

                            if !is_allowed {
                                warn!("❌ Subfolder '{}' not allowed", subfolder);
                                return Ok(Response::builder()
                                    .status(http::StatusCode::FORBIDDEN)
                                    .body(Body::from(format!(
                                        "Subfolder '{}' not allowed",
                                        subfolder
                                    )))
                                    .unwrap());
                            }
                            debug!("✅ Subfolder '{}' allowed", subfolder);
                        }
                        let folder = format!("{}/{}", config.folder, subfolder);
                        debug!("📁 Full upload folder: '{}'", folder);
                        folder
                    } else {
                        debug!(
                            "📁 Subfolder not specified, using root: '{}'",
                            config.folder
                        );
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
                        if let Some(extension) = Path::new(&filename).extension() {
                            let ext_str = extension.to_string_lossy().to_lowercase();
                            if !allowed_extensions.iter().any(|allowed| {
                                allowed.trim_start_matches('.').to_lowercase() == ext_str
                            }) {
                                warn!("❌ File extension .{} not allowed", ext_str);
                                return Ok(Response::builder()
                                    .status(http::StatusCode::FORBIDDEN)
                                    .body(Body::from(format!(
                                        "File extension .{} not allowed",
                                        ext_str
                                    )))
                                    .unwrap());
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
                            return Ok(Response::builder()
                                .status(http::StatusCode::FORBIDDEN)
                                .body(Body::from(format!("MIME type {} not allowed", mime_type)))
                                .unwrap());
                        }
                    }

                    // Read file content
                    let data = match field.bytes().await {
                        Ok(data) => {
                            debug!("📄 File data size: {} bytes", data.len());
                            if data.is_empty() {
                                warn!("⚠️ File '{}' is empty, skipping", filename);
                                continue;
                            }
                            data
                        }
                        Err(e) => {
                            error!("❌ Failed to read file data: {:?}", e);
                            return Ok(Response::builder()
                                .status(http::StatusCode::BAD_REQUEST)
                                .body(Body::from("Failed to read file data"))
                                .unwrap());
                        }
                    };

                    // Check file size
                    if let Some(max_size) = config.max_file_size {
                        if data.len() as u64 > max_size {
                            warn!("❌ File size {} exceeds limit {}", data.len(), max_size);
                            return Ok(Response::builder()
                                .status(http::StatusCode::PAYLOAD_TOO_LARGE)
                                .body(Body::from(format!(
                                    "File size {} exceeds limit {}",
                                    data.len(),
                                    max_size
                                )))
                                .unwrap());
                        }
                    }

                    // Check overwrite
                    let file_path = format!("{}/{}", upload_folder, filename);
                    if !config.overwrite && Path::new(&file_path).exists() {
                        warn!("❌ File {} already exists", relative_path);
                        return Ok(Response::builder()
                            .status(http::StatusCode::CONFLICT)
                            .body(Body::from(format!("File {} already exists", relative_path)))
                            .unwrap());
                    }

                    // Create folder if it doesn't exist
                    debug!("📁 Creating folder: '{}'", upload_folder);
                    if let Err(e) = std::fs::create_dir_all(&upload_folder) {
                        error!("❌ Error creating folder '{}': {}", upload_folder, e);
                        return Ok(html_templates::generate_generic_error_page(
                            "Failed to create upload directory",
                            Some(&format!("Error: {}", e)),
                        ));
                    }
                    debug!("✅ Folder created successfully: '{}'", upload_folder);

                    // Save file
                    debug!("💾 Saving file to: '{}'", file_path);
                    if let Err(e) = std::fs::write(&file_path, &data) {
                        error!("❌ Error saving file '{}': {}", file_path, e);
                        return Ok(html_templates::generate_generic_error_page(
                            "Failed to save file",
                            Some(&format!("Error: {}", e)),
                        ));
                    }
                    debug!("✅ File saved successfully: '{}'", file_path);

                    // Check file count based on upload type
                    if config.multiple {
                        // For multiple uploads check maxFiles
                        if let Some(max_files) = config.max_files {
                            if uploaded_files.len() >= max_files as usize {
                                warn!("❌ Maximum number of files ({}) exceeded", max_files);
                                return Ok(html_templates::generate_error_page(
                                    http::StatusCode::PAYLOAD_TOO_LARGE,
                                    "Too Many Files",
                                    &format!("Maximum number of files ({}) exceeded", max_files),
                                    None,
                                    dev_mode,
                                ));
                            }
                        }
                    } else {
                        // For single upload allow only 1 file
                        if uploaded_files.len() >= 1 {
                            warn!("❌ Single file upload route received multiple files");
                            return Ok(html_templates::generate_bad_request_page(
                                "Single file upload route received multiple files",
                                None,
                            ));
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
                    debug!(
                        "💾 File saved: {} ({} bytes, {})",
                        file_path,
                        data.len(),
                        mime_type
                    );
                } else {
                    // This is a regular form field
                    debug!("📝 Processing regular form field: '{}'", field_name);
                    let value = field.text().await.unwrap_or_else(|_| String::new());
                    debug!("📝 Form field value: '{}' = '{}'", field_name, value);
                    form_fields.insert(field_name, value);
                }
            }
            Ok(None) => {
                debug!("📄 No more fields found, ending multipart processing");
                break; // End of multipart data
            }
            Err(e) => {
                error!("❌ Error parsing multipart field: {:?}", e);
                break; // Parsing error
            }
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

    Ok(Response::builder()
        .status(http::StatusCode::OK)
        .header("content-type", "application/json")
        .body(Body::from(response.to_string()))
        .unwrap())
}
