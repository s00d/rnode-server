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
