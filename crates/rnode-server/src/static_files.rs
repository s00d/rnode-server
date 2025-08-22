use neon::prelude::*;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{OnceLock, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};

// Structure for static file settings
#[derive(Debug, Clone)]
pub struct StaticOptions {
    pub cache: bool,
    pub max_age: Option<u32>,
    pub max_file_size: Option<usize>,
    pub etag: bool,
    pub last_modified: bool,
    pub gzip: bool,
    pub brotli: bool,
    pub allow_hidden_files: bool,
    pub allow_system_files: bool,
    pub allowed_extensions: Vec<String>,
    pub blocked_paths: Vec<String>,
}

impl Default for StaticOptions {
    fn default() -> Self {
        Self {
            cache: true,
            max_age: Some(3600),                   // 1 hour by default
            max_file_size: Some(10 * 1024 * 1024), // 10MB by default
            etag: true,
            last_modified: true,
            gzip: true,
            brotli: false,
            allow_hidden_files: false,
            allow_system_files: false,
            allowed_extensions: vec![
                "html".to_string(),
                "css".to_string(),
                "js".to_string(),
                "json".to_string(),
                "png".to_string(),
                "jpg".to_string(),
                "jpeg".to_string(),
                "gif".to_string(),
                "svg".to_string(),
                "ico".to_string(),
                "woff".to_string(),
                "woff2".to_string(),
                "ttf".to_string(),
                "eot".to_string(),
            ],
            blocked_paths: vec![
                ".git".to_string(),
                ".env".to_string(),
                ".htaccess".to_string(),
                "thumbs.db".to_string(),
                ".ds_store".to_string(),
                "desktop.ini".to_string(),
            ],
        }
    }
}

// Structure for storing static file information
#[derive(Debug, Clone)]
pub struct StaticFile {
    pub content: Vec<u8>,
    pub mime_type: String,
    pub size: usize,
    pub modified_time: u64,
    pub etag: String,
    pub content_type_header: String, // Ready Content-Type header with encoding

    // Ready compressed versions (if enabled)
    pub gzip_content: Option<Vec<u8>>,
    pub brotli_content: Option<Vec<u8>>,

    // Ready headers for different response types
    pub headers: StaticFileHeaders,
}

// Structure for storing ready headers
#[derive(Debug, Clone)]
pub struct StaticFileHeaders {
    pub etag: String,
    pub last_modified: String,
    pub cache_control: String,
}

// Structure for storing folder settings
#[derive(Debug, Clone)]
pub struct StaticFolder {
    pub path: String,
    pub options: StaticOptions,
}

// Global storage for multiple folders
static STATIC_FOLDERS: OnceLock<RwLock<Vec<StaticFolder>>> = OnceLock::new();

// Global storage for static files cache
static STATIC_FILES_CACHE: OnceLock<RwLock<HashMap<String, StaticFile>>> = OnceLock::new();

// Function for getting static files cache
pub fn get_static_files_cache() -> &'static RwLock<HashMap<String, StaticFile>> {
    STATIC_FILES_CACHE.get_or_init(|| RwLock::new(HashMap::new()))
}

// Function for getting static folders
fn get_static_folders() -> &'static RwLock<Vec<StaticFolder>> {
    STATIC_FOLDERS.get_or_init(|| RwLock::new(Vec::new()))
}

// Function for loading static files settings (without loading the files themselves)
pub fn load_static_files(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let static_path = cx.argument::<JsString>(0)?.value(&mut cx);

    // Convert relative path to absolute from current working directory
    let absolute_path = if static_path.starts_with("./")
        || static_path.starts_with("../")
        || !static_path.starts_with('/')
    {
        match std::env::current_dir() {
            Ok(current_dir) => {
                let full_path = current_dir.join(&static_path);
                full_path.canonicalize().unwrap_or(full_path)
            }
            Err(_) => PathBuf::from(&static_path),
        }
    } else {
        PathBuf::from(&static_path)
    };

    let absolute_path_str = absolute_path.to_string_lossy();

    println!(
        "📁 Loading static files configuration for path: {}",
        static_path
    );
    println!("📍 Absolute path: {}", absolute_path_str);

    // Get options if they are passed
    let options = if cx.len() > 1 {
        if let Ok(options_obj) = cx.argument::<JsObject>(1) {
            let parsed_options = parse_static_options(&mut cx, options_obj);
            println!(
                "🔧 Parsed static options: cache={}, maxAge={:?}, gzip={}, brotli={}",
                parsed_options.cache,
                parsed_options.max_age,
                parsed_options.gzip,
                parsed_options.brotli
            );
            parsed_options
        } else {
            println!("⚠️  Failed to parse options, using defaults");
            StaticOptions::default()
        }
    } else {
        println!("📋 Using default static options");
        StaticOptions::default()
    };

    println!(
        "📁 Registered static files folder: {} (absolute: {}) with options: {:?}",
        static_path, absolute_path_str, options
    );

    // Add folder to list synchronously
    {
        let folders = get_static_folders();
        let mut folders_write = folders.write().unwrap();
        folders_write.push(StaticFolder {
            path: absolute_path_str.to_string(),
            options,
        });
        println!(
            "✅ Static folder registered: {} (absolute: {}) ({} folders total)",
            static_path,
            absolute_path_str,
            folders_write.len()
        );
    }

    Ok(cx.undefined())
}

// Function for parsing options from JavaScript object
fn parse_static_options(cx: &mut FunctionContext, options_obj: Handle<JsObject>) -> StaticOptions {
    let mut options = StaticOptions::default();

    // Parse cache
    if let Ok(cache) = options_obj.get::<JsBoolean, _, _>(cx, "cache") {
        options.cache = cache.value(cx);
    }

    // Parse maxAge
    if let Ok(max_age) = options_obj.get::<JsNumber, _, _>(cx, "maxAge") {
        options.max_age = Some(max_age.value(cx) as u32);
    }

    // Parse maxFileSize
    if let Ok(max_file_size) = options_obj.get::<JsNumber, _, _>(cx, "maxFileSize") {
        options.max_file_size = Some(max_file_size.value(cx) as usize);
    }

    // Parse etag
    if let Ok(etag) = options_obj.get::<JsBoolean, _, _>(cx, "etag") {
        options.etag = etag.value(cx);
    }

    // Parse lastModified
    if let Ok(last_modified) = options_obj.get::<JsBoolean, _, _>(cx, "lastModified") {
        options.last_modified = last_modified.value(cx);
    }

    // Parse gzip
    if let Ok(gzip) = options_obj.get::<JsBoolean, _, _>(cx, "gzip") {
        options.gzip = gzip.value(cx);
    }

    // Parse brotli
    if let Ok(brotli) = options_obj.get::<JsBoolean, _, _>(cx, "brotli") {
        options.brotli = brotli.value(cx);
    }

    // Parse security options directly
    if let Ok(allow_hidden) = options_obj.get::<JsBoolean, _, _>(cx, "allowHiddenFiles") {
        options.allow_hidden_files = allow_hidden.value(cx);
    }
    if let Ok(allow_system) = options_obj.get::<JsBoolean, _, _>(cx, "allowSystemFiles") {
        options.allow_system_files = allow_system.value(cx);
    }
    if let Ok(allowed_ext) = options_obj.get::<JsArray, _, _>(cx, "allowedExtensions") {
        let mut extensions = Vec::new();
        for i in 0..allowed_ext.len(cx) {
            if let Ok(ext) = allowed_ext.get::<JsString, _, _>(cx, i) {
                extensions.push(ext.value(cx));
            }
        }
        if !extensions.is_empty() {
            options.allowed_extensions = extensions;
        }
    }
    if let Ok(blocked_paths) = options_obj.get::<JsArray, _, _>(cx, "blockedPaths") {
        let mut paths = Vec::new();
        for i in 0..blocked_paths.len(cx) {
            if let Ok(path) = blocked_paths.get::<JsString, _, _>(cx, i) {
                paths.push(path.value(cx));
            }
        }
        if !paths.is_empty() {
            options.blocked_paths = paths;
        }
    }

    options
}

// Function for checking file security
fn is_file_safe(path: &std::path::Path, options: &StaticOptions) -> bool {
    let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");

    let path_str = path.to_string_lossy();

    // Check blocked paths
    for blocked in &options.blocked_paths {
        if path_str.contains(blocked) {
            return false;
        }
    }

    // Check hidden files
    if !options.allow_hidden_files && file_name.starts_with('.') {
        return false;
    }

    // Check system files
    if !options.allow_system_files {
        let lower_name = file_name.to_lowercase();
        if lower_name == "thumbs.db" || lower_name == ".ds_store" || lower_name == "desktop.ini" {
            return false;
        }
    }

    // Check file extensions
    if let Some(extension) = path.extension() {
        if let Some(ext_str) = extension.to_str() {
            let ext_lower = ext_str.to_lowercase();
            if !options.allowed_extensions.contains(&ext_lower) {
                return false;
            }
        }
    }

    true
}

// Function for determining file MIME type
pub fn get_mime_type(path: &std::path::Path) -> String {
    mime_guess::from_path(path)
        .first_or_octet_stream()
        .to_string()
}

// Function for getting file from cache
fn get_file_from_cache(path: &str) -> Option<StaticFile> {
    let cache = get_static_files_cache();
    let cache_read = cache.read().unwrap();
    cache_read.get(path).cloned()
}

// Function for preparing file for response (compression, headers, etc.)
fn process_file_for_response(
    static_file: &mut StaticFile,
    folder_options: &StaticOptions,
    file_path: &str,
) {
    // Generate ETag
    if folder_options.etag {
        let etag_value = generate_etag(&static_file.content, static_file.modified_time);
        println!("🏷️  Generated ETag: {}", etag_value);
        static_file.etag = etag_value;
    }

    // Create compressed versions if enabled
    if folder_options.gzip {
        match compress_gzip(&static_file.content) {
            Some(compressed) => {
                println!(
                    "🗜️  Gzip compression: {} -> {} bytes (ratio: {:.1}%)",
                    static_file.size,
                    compressed.len(),
                    (compressed.len() as f64 / static_file.size as f64) * 100.0
                );
                static_file.gzip_content = Some(compressed);
            }
            None => {
                println!("⚠️  Gzip compression failed");
            }
        }
    }

    if folder_options.brotli {
        match compress_brotli(&static_file.content) {
            Some(compressed) => {
                println!(
                    "🗜️  Brotli compression: {} -> {} bytes (ratio: {:.1}%)",
                    static_file.size,
                    compressed.len(),
                    (compressed.len() as f64 / static_file.size as f64) * 100.0
                );
                static_file.brotli_content = Some(compressed);
            }
            None => {
                println!("⚠️  Brotli compression failed");
            }
        }
    }

    // Determine Content-Type header with encoding
    if static_file.mime_type.starts_with("text/")
        || static_file.mime_type.contains("javascript")
        || static_file.mime_type.contains("json")
        || static_file.mime_type.contains("xml")
    {
        let encoding =
            get_file_encoding(PathBuf::from(file_path).as_path(), &static_file.mime_type);
        if !encoding.is_empty() {
            static_file.content_type_header =
                format!("{}; charset={}", static_file.mime_type, encoding);
        } else {
            static_file.content_type_header = static_file.mime_type.clone();
        }
    } else {
        static_file.content_type_header = static_file.mime_type.clone();
    }

    // Generate ready headers
    let last_modified = httpdate::fmt_http_date(
        SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(static_file.modified_time),
    );

    static_file.headers = StaticFileHeaders {
        etag: static_file.etag.clone(),
        last_modified,
        cache_control: "public, max-age=3600".to_string(),
    };
}

// Function for determining file encoding
fn get_file_encoding(path: &std::path::Path, mime_type: &str) -> String {
    // For text files determine encoding
    if mime_type.starts_with("text/")
        || mime_type.contains("javascript")
        || mime_type.contains("json")
        || mime_type.contains("xml")
    {
        // Read file content for analysis
        if let Ok(content) = std::fs::read(path) {
            // Check BOM (Byte Order Mark)
            if content.len() >= 3 {
                // UTF-8 BOM
                if content[0] == 0xEF && content[1] == 0xBB && content[2] == 0xBF {
                    return "utf-8".to_string();
                }
                // UTF-16 LE BOM
                if content[0] == 0xFF && content[1] == 0xFE {
                    return "utf-16le".to_string();
                }
                // UTF-16 BE BOM
                if content[0] == 0xFE && content[1] == 0xFF {
                    return "utf-16be".to_string();
                }
            }

            // Try UTF-8
            if std::str::from_utf8(&content).is_ok() {
                return "utf-8".to_string();
            }
        }

        // Default to UTF-8 for text files
        return "utf-8".to_string();
    }

    // For binary files encoding is not needed
    "".to_string()
}

// Function for generating ETag
fn generate_etag(content: &[u8], modified_time: u64) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    content.hash(&mut hasher);
    modified_time.hash(&mut hasher);

    format!("\"{:x}\"", hasher.finish())
}

// Function for Gzip compression
fn compress_gzip(data: &[u8]) -> Option<Vec<u8>> {
    use flate2::Compression;
    use flate2::write::GzEncoder;
    use std::io::Write;

    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    if encoder.write_all(data).is_ok() {
        encoder.finish().ok()
    } else {
        None
    }
}

// Function for Brotli compression
fn compress_brotli(data: &[u8]) -> Option<Vec<u8>> {
    use brotli::BrotliCompress;
    use brotli::enc::BrotliEncoderParams;
    use std::io::Cursor;

    let mut params = BrotliEncoderParams::default();
    params.quality = 11; // Maximum quality

    let mut output = Vec::new();
    let mut input = Cursor::new(data);
    if BrotliCompress(&mut input, &mut output, &params).is_ok() {
        Some(output)
    } else {
        None
    }
}

// Function for loading file to cache
async fn load_file_to_cache(
    file_path: &str,
    folder_options: &StaticOptions,
    original_path: &str,
) -> bool {
    println!(
        "📂 Loading file: {} (requested path: {})",
        file_path, file_path
    );

    // Search for file in registered folders
    let folders = get_static_folders();
    let folders_clone = {
        let folders_read = folders.read().unwrap();
        folders_read.clone()
    };

    let mut found_path = None;
    for folder in folders_clone.iter() {
        let folder_file_path = format!("{}/{}", folder.path, file_path.trim_start_matches('/'));
        let folder_path = PathBuf::from(&folder_file_path);
        println!(
            "🔍 Checking path: {} -> {}",
            folder_file_path,
            folder_path.display()
        );

        if folder_path.exists() {
            println!(
                "✅ Found file in folder {}: {}",
                folder.path,
                folder_path.display()
            );
            found_path = Some(folder_path);
            break;
        }
    }

    let final_path = found_path.unwrap_or_else(|| {
        // Fallback: попробуем текущую директорию
        match std::env::current_dir() {
            Ok(current_dir) => current_dir.join(file_path.trim_start_matches('/')),
            Err(_) => PathBuf::from(file_path),
        }
    });

    println!("📂 Final file path: {}", final_path.display());

    // Check security
    if !is_file_safe(&final_path, folder_options) {
        println!(
            "🚫 Skipping unsafe file: {} (security check failed)",
            final_path.display()
        );
        return false;
    }

    // Check file existence
    if !final_path.exists() || !final_path.is_file() {
        println!(
            "❌ File does not exist or is not a file: {}",
            final_path.display()
        );
        return false;
    }

    // Get metadata
    let metadata = match std::fs::metadata(&final_path) {
        Ok(m) => m,
        Err(e) => {
            println!(
                "❌ Failed to get file metadata: {} - {}",
                final_path.display(),
                e
            );
            return false;
        }
    };

    let file_size = metadata.len() as usize;
    println!("📊 File size: {} bytes", file_size);

    // Check file size limit
    if let Some(max_size) = folder_options.max_file_size {
        if file_size > max_size {
            println!(
                "🚫 Skipping file {}: size {} exceeds limit {}",
                final_path.display(),
                file_size,
                max_size
            );
            return false;
        }
    }

    // Read file content
    let content = match std::fs::read(&final_path) {
        Ok(c) => c,
        Err(e) => {
            println!("❌ Failed to read file: {} - {}", final_path.display(), e);
            return false;
        }
    };

    let mime_type = get_mime_type(&final_path);
    println!("📄 MIME type: {}", mime_type);

    // Get modification time
    let modified_time = match metadata.modified() {
        Ok(time) => time
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
        Err(_) => {
            println!("⚠️  Failed to get file modification time, using current time");
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()
        }
    };

    // Create basic file structure
    let mut static_file = StaticFile {
        content,
        mime_type: mime_type.clone(),
        size: file_size,
        modified_time,
        etag: String::new(),
        content_type_header: String::new(),
        gzip_content: None,
        brotli_content: None,
        headers: StaticFileHeaders {
            etag: String::new(),
            last_modified: String::new(),
            cache_control: String::new(),
        },
    };

    // Process file (compression, headers, etc.)
    process_file_for_response(&mut static_file, folder_options, file_path);

    // Add to cache using original path, not search_path
    let cache = get_static_files_cache();
    let mut cache_write = cache.write().unwrap();

    // Use original path for caching
    cache_write.insert(original_path.to_string(), static_file);
    println!(
        "💾 File added to cache: {} (cache size: {})",
        original_path,
        cache_write.len()
    );

    println!(
        "✅ File loaded to cache: {} ({} bytes, MIME: {})",
        file_path, file_size, mime_type
    );

    true
}

// Function for finding suitable folder by file path
fn find_folder_for_path(file_path: &str) -> Option<StaticOptions> {
    let folders = get_static_folders();
    let folders_read = folders.read().unwrap();

    println!(
        "🔍 Searching for folder configuration for path: {} ({} folders registered)",
        file_path,
        folders_read.len()
    );

    // Convert requested path to absolute for comparison
    let absolute_file_path = if file_path.starts_with("/") {
        match std::env::current_dir() {
            Ok(current_dir) => current_dir.join(file_path.trim_start_matches('/')),
            Err(_) => PathBuf::from(file_path),
        }
    } else {
        match std::env::current_dir() {
            Ok(current_dir) => current_dir.join(file_path),
            Err(_) => PathBuf::from(file_path),
        }
    };

    let absolute_file_path_str = absolute_file_path.to_string_lossy();
    println!("📍 Absolute file path: {}", absolute_file_path_str);

    for folder in folders_read.iter() {
        println!(
            "🔍 Checking folder: {} against file path: {}",
            folder.path, absolute_file_path_str
        );

        // Check if folder contains requested file
        // Create full path to file in this folder
        let folder_file_path = format!("{}/{}", folder.path, file_path);
        let folder_path = PathBuf::from(&folder_file_path);

        println!(
            "🔍 Checking if folder contains file: {} -> {}",
            folder_file_path,
            folder_path.display()
        );

        if folder_path.exists() && folder_path.is_file() {
            println!(
                "✅ Found matching folder: {} for path: {} (file exists: {})",
                folder.path,
                file_path,
                folder_path.display()
            );
            return Some(folder.options.clone());
        }
    }

    println!(
        "⚠️  No matching folder found for path: {} (absolute: {})",
        file_path, absolute_file_path_str
    );
    None
}

// Function for handling static files
pub async fn handle_static_file(
    path: String,
    accept_encoding: Option<&str>,
) -> Option<axum::response::Response<axum::body::Body>> {
    println!(
        "🔍 Handling static file request: {} (accept-encoding: {:?})",
        path, accept_encoding
    );

    // Determine real path for search
    let search_path = if path == "/" {
        // Root path - search for index.html in root
        "index.html".to_string()
    } else if path.ends_with('/') {
        // Path ends with / - search for index.html in specified folder
        let folder_path = path.trim_end_matches('/').trim_start_matches('/');
        format!("{}/index.html", folder_path)
    } else if !path.contains('.') || !path.split('/').last().unwrap_or("").contains('.') {
        // If last path segment doesn't contain dot - it's a folder, search for index.html
        let folder_path = path.trim_start_matches('/');
        format!("{}/index.html", folder_path)
    } else {
        // Regular file
        path.clone()
    };

    println!("🔍 Search path: {} (original: {})", search_path, path);

    // First check cache
    let cache = get_static_files_cache();
    let cached_file = cache.read().unwrap().get(&path).cloned();

    if let Some(static_file) = cached_file {
        println!(
            "✅ File found in cache: {} ({} bytes)",
            path, static_file.size
        );
        return build_static_response(&static_file, accept_encoding, &path);
    }

    println!("💾 File not in cache, searching for folder configuration...");

    // If file not in cache, search for suitable folder and load
    if let Some(folder_options) = find_folder_for_path(&search_path) {
        println!("📂 Found folder configuration for path: {}", search_path);

        // Load file to cache, passing original path for correct caching
        if load_file_to_cache(&search_path, &folder_options, &path).await {
            println!("📥 File loaded to cache: {}", search_path);

            // Now get processed file from cache
            if let Some(static_file) = get_file_from_cache(&path) {
                return build_static_response(&static_file, accept_encoding, &path);
            }
        } else {
            println!("❌ Failed to load file to cache: {}", search_path);
        }
    } else {
        println!(
            "⚠️  No folder configuration found for path: {}",
            search_path
        );
    }

    println!("❌ File not found: {}", path);
    None
}

// Function for building response with static file
fn build_static_response(
    static_file: &StaticFile,
    accept_encoding: Option<&str>,
    _file_path: &str,
) -> Option<axum::response::Response<axum::body::Body>> {
    use axum::body::Body;
    use axum::http::StatusCode;
    use axum::response::Response;

    println!(
        "🔧 Building response for file: {} bytes, MIME: {}",
        static_file.size, static_file.mime_type
    );

    // Determine content and compression headers
    let (content, content_encoding) = if let Some(accept_enc) = accept_encoding {
        if accept_enc.contains("br") && static_file.brotli_content.is_some() {
            let compressed = static_file.brotli_content.as_ref().unwrap();
            println!(
                "🗜️  Using Brotli compressed content: {} -> {} bytes",
                static_file.size,
                compressed.len()
            );
            (compressed, "br")
        } else if accept_enc.contains("gzip") && static_file.gzip_content.is_some() {
            let compressed = static_file.gzip_content.as_ref().unwrap();
            println!(
                "🗜️  Using Gzip compressed content: {} -> {} bytes",
                static_file.size,
                compressed.len()
            );
            (compressed, "gzip")
        } else {
            println!(
                "📄 Using uncompressed content: {} bytes",
                static_file.content.len()
            );
            (&static_file.content, "")
        }
    } else {
        println!(
            "📄 No accept-encoding, using uncompressed content: {} bytes",
            static_file.content.len()
        );
        (&static_file.content, "")
    };

    let mut response_builder = Response::builder().status(StatusCode::OK);

    // Use ready Content-Type header
    response_builder = response_builder.header("content-type", &static_file.content_type_header);
    println!(
        "📄 Content-Type: {} (cached)",
        static_file.content_type_header
    );

    // Add Content-Length only for uncompressed content
    if content_encoding.is_empty() {
        response_builder = response_builder.header("content-length", content.len().to_string());
        println!("📏 Added content-length header: {} bytes", content.len());
    } else {
        println!(
            "📏 Skipping content-length for compressed content ({} -> {} bytes)",
            static_file.size,
            content.len()
        );
    }

    // Add ready headers from cache
    response_builder = response_builder
        .header("cache-control", &static_file.headers.cache_control)
        .header("etag", &static_file.headers.etag)
        .header("last-modified", &static_file.headers.last_modified);

    println!(
        "🏷️  Added cached headers: ETag={}, Last-Modified={}, Cache-Control={}",
        static_file.headers.etag,
        static_file.headers.last_modified,
        static_file.headers.cache_control
    );

    if !content_encoding.is_empty() {
        response_builder = response_builder.header("content-encoding", content_encoding);
        println!("🗜️  Added content-encoding header: {}", content_encoding);
    }

    println!("✅ Response built successfully for {} bytes", content.len());
    response_builder.body(Body::from(content.clone())).ok()
}

// Function for clearing static files cache
pub fn clear_static_cache(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let cache = get_static_files_cache();
    let mut cache_write = cache.write().unwrap();
    let cache_size = cache_write.len();
    cache_write.clear();
    println!(
        "🧹 Static files cache cleared: {} files removed",
        cache_size
    );
    Ok(cx.undefined())
}

// Function for getting static files statistics
pub fn get_static_stats(mut cx: FunctionContext) -> JsResult<JsString> {
    let cache = get_static_files_cache();
    let folders = get_static_folders();

    let cache_read = cache.read().unwrap();
    let folders_read = folders.read().unwrap();

    let total_files = cache_read.len();
    let total_size: usize = cache_read.values().map(|f| f.size).sum();
    let folders_count = folders_read.len();

    let stats = format!(
        "Static files: {} files in cache, {} bytes, {} folders registered",
        total_files, total_size, folders_count
    );
    println!("📊 Static files statistics: {}", stats);
    Ok(cx.string(stats))
}
