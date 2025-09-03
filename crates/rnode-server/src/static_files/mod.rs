pub mod types;
pub mod options;
pub mod cache;
pub mod security;
pub mod handlers;
pub mod fallback;

use crate::metrics::{record_cache_hit, record_cache_miss};
use log::{debug, error, info, warn};
use neon::prelude::*;

use std::path::PathBuf;
use std::sync::{OnceLock, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};

use self::types::{StaticFile, StaticFileHeaders, StaticFolder, StaticOptions};
use self::cache::get_static_files_cache;
use self::options::parse_static_options;
use self::security::is_file_safe;
use crate::compression::{compress_gzip, compress_brotli, compress_zstd, compress_lz4};
use self::handlers::build_static_response;

// Global storage for multiple folders
static STATIC_FOLDERS: OnceLock<RwLock<Vec<StaticFolder>>> = OnceLock::new();

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

    info!(
        "📁 Loading static files configuration for path: {}",
        static_path
    );
    debug!("📍 Absolute path: {}", absolute_path_str);

    // Get options if they are passed
    let options = if cx.len() > 1 {
        if let Ok(options_obj) = cx.argument::<JsObject>(1) {
            let parsed_options = parse_static_options(&mut cx, options_obj);
            debug!(
                "🔧 Parsed static options: cache={}, maxAge={:?}, gzip={}, brotli={}, zstd={}, lz4={}",
                parsed_options.cache,
                parsed_options.max_age,
                parsed_options.gzip,
                parsed_options.brotli,
                parsed_options.zstd,
                parsed_options.lz4
            );
            parsed_options
        } else {
            warn!("⚠️  Failed to parse options, using defaults");
            StaticOptions::default()
        }
    } else {
        info!("📋 Using default static options");
        StaticOptions::default()
    };

    info!(
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
        info!(
            "✅ Static folder registered: {} (absolute: {}) ({} folders total)",
            static_path,
            absolute_path_str,
            folders_write.len()
        );
    }

    Ok(cx.undefined())
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
    let result = cache_read.get(path).cloned();

    // Record cache metrics
    if result.is_some() {
        record_cache_hit();
    } else {
        record_cache_miss();
    }

    result
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

// Function for preparing file for response (compression, headers, etc.)
fn process_file_for_response(
    static_file: &mut StaticFile,
    folder_options: &StaticOptions,
    file_path: &str,
) {
    // Generate ETag
    if folder_options.etag {
        let etag_value = generate_etag(&static_file.content, static_file.modified_time);
        debug!("🏷️  Generated ETag: {}", etag_value);
        static_file.etag = etag_value;
    }

    // Create compressed versions if enabled
    if folder_options.gzip {
        match compress_gzip(&static_file.content) {
            Some(compressed) => {
                debug!(
                    "🗜️  Gzip compression: {} -> {} bytes (ratio: {:.1}%)",
                    static_file.size,
                    compressed.len(),
                    (compressed.len() as f64 / static_file.size as f64) * 100.0
                );
                static_file.gzip_content = Some(compressed);
            }
            None => {
                warn!("⚠️  Gzip compression failed");
            }
        }
    }

    if folder_options.brotli {
        match compress_brotli(&static_file.content) {
            Some(compressed) => {
                debug!(
                    "🗜️  Brotli compression: {} -> {} bytes (ratio: {:.1}%)",
                    static_file.size,
                    compressed.len(),
                    (compressed.len() as f64 / static_file.size as f64) * 100.0
                );
                static_file.brotli_content = Some(compressed);
            }
            None => {
                warn!("⚠️  Brotli compression failed");
            }
        }
    }

    if folder_options.zstd {
        match compress_zstd(&static_file.content) {
            Some(compressed) => {
                debug!(
                    "🗜️  Zstandard compression: {} -> {} bytes (ratio: {:.1}%)",
                    static_file.size,
                    compressed.len(),
                    (compressed.len() as f64 / static_file.size as f64) * 100.0
                );
                static_file.zstd_content = Some(compressed);
            }
            None => {
                warn!("⚠️  Zstandard compression failed");
            }
        }
    }

    if folder_options.lz4 {
        match compress_lz4(&static_file.content) {
            Some(compressed) => {
                debug!(
                    "🗜️  LZ4 compression: {} -> {} bytes (ratio: {:.1}%)",
                    static_file.size,
                    compressed.len(),
                    (compressed.len() as f64 / static_file.size as f64) * 100.0
                );
                static_file.lz4_content = Some(compressed);
            }
            None => {
                warn!("⚠️  LZ4 compression failed");
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

// Function for loading file to cache
async fn load_file_to_cache(
    file_path: &str,
    folder_options: &StaticOptions,
    original_path: &str,
) -> bool {
    debug!(
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
        debug!(
            "🔍 Checking path: {} -> {}",
            folder_file_path,
            folder_path.display()
        );

        if folder_path.exists() {
            debug!(
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

    debug!("📂 Final file path: {}", final_path.display());

    // Check security
    if !is_file_safe(&final_path, folder_options) {
        warn!(
            "🚫 Skipping unsafe file: {} (security check failed)",
            final_path.display()
        );
        return false;
    }

    // Check file existence
    if !final_path.exists() || !final_path.is_file() {
        warn!(
            "❌ File does not exist or is not a file: {}",
            final_path.display()
        );
        return false;
    }

    // Get metadata
    let metadata = match std::fs::metadata(&final_path) {
        Ok(m) => m,
        Err(e) => {
            warn!(
                "❌ Failed to get file metadata: {} - {}",
                final_path.display(),
                e
            );
            return false;
        }
    };

    let file_size = metadata.len() as usize;
    debug!("📊 File size: {} bytes", file_size);

    // Check file size limit
    if let Some(max_size) = folder_options.max_file_size {
        if file_size > max_size {
            warn!(
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
            error!("❌ Failed to read file: {} - {}", final_path.display(), e);
            return false;
        }
    };

    let mime_type = get_mime_type(&final_path);
    debug!("📄 MIME type: {}", mime_type);

    // Get modification time
    let modified_time = match metadata.modified() {
        Ok(time) => time
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
        Err(_) => {
            warn!("⚠️  Failed to get file modification time, using current time");
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
        zstd_content: None,
        lz4_content: None,
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
    debug!(
        "💾 File added to cache: {} (cache size: {})",
        original_path,
        cache_write.len()
    );

    // Record cache miss since we had to load from disk
    record_cache_miss();

    info!(
        "✅ File loaded to cache: {} ({} bytes, MIME: {})",
        file_path, file_size, mime_type
    );

    true
}

// Function for finding suitable folder by file path
fn find_folder_for_path(file_path: &str) -> Option<StaticOptions> {
    let folders = get_static_folders();
    let folders_read = folders.read().unwrap();

    debug!(
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
    debug!("📍 Absolute file path: {}", absolute_file_path_str);

    for folder in folders_read.iter() {
        debug!(
            "🔍 Checking folder: {} against file path: {}",
            folder.path, absolute_file_path_str
        );

        // Check if folder contains requested file
        // Create full path to file in this folder
        let folder_file_path = format!("{}/{}", folder.path, file_path);
        let folder_path = PathBuf::from(&folder_file_path);

        debug!(
            "🔍 Checking if folder contains file: {} -> {}",
            folder_file_path,
            folder_path.display()
        );

        if folder_path.exists() && folder_path.is_file() {
            debug!(
                "✅ Found matching folder: {} for path: {} (file exists: {})",
                folder.path,
                file_path,
                folder_path.display()
            );
            return Some(folder.options.clone());
        }
    }

    warn!(
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
    debug!(
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

    debug!("🔍 Search path: {} (original: {})", search_path, path);

    // First check cache
    let cache = get_static_files_cache();
    let cached_file = cache.read().unwrap().get(&path).cloned();

    if let Some(static_file) = cached_file {
        debug!(
            "✅ File found in cache: {} ({} bytes)",
            path, static_file.size
        );
        record_cache_hit(); // Record cache hit
        return build_static_response(&static_file, accept_encoding, &path);
    }

    record_cache_miss(); // Record cache miss

    debug!("💾 File not in cache, searching for folder configuration...");

    // If file not in cache, search for suitable folder and load
    if let Some(folder_options) = find_folder_for_path(&search_path) {
        debug!("📂 Found folder configuration for path: {}", search_path);

        // Load file to cache, passing original path for correct caching
        if load_file_to_cache(&search_path, &folder_options, &path).await {
            info!("📥 File loaded to cache: {}", search_path);

            // Now get processed file from cache
            if let Some(static_file) = get_file_from_cache(&path) {
                return build_static_response(&static_file, accept_encoding, &path);
            }
        } else {
            warn!("❌ Failed to load file to cache: {}", search_path);
        }
    } else {
        warn!(
            "⚠️  No folder configuration found for path: {}",
            search_path
        );
    }

    warn!("❌ File not found: {}", path);
    None
}

// Function for clearing static files cache
pub fn clear_static_cache(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let cache = get_static_files_cache();
    let mut cache_write = cache.write().unwrap();
    let cache_size = cache_write.len();
    cache_write.clear();
    info!(
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
    info!("📊 Static files statistics: {}", stats);
    Ok(cx.string(stats))
}
