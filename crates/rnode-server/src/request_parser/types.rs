/// Structure for file information
#[derive(Debug)]
pub struct FileInfo {
    pub filename: String,
    pub content_type: String,
    pub size: usize,
    pub data: String, // Base64 encoded data
}

/// Content types enum
#[derive(Debug, Clone, PartialEq)]
pub enum ContentType {
    MultipartFormData,
    Json,
    FormUrlEncoded,
    Text,
    Binary,
    Unknown,
}

impl From<&str> for ContentType {
    fn from(content_type: &str) -> Self {
        if content_type.contains("multipart/form-data") {
            ContentType::MultipartFormData
        } else if content_type.contains("application/json") {
            ContentType::Json
        } else if content_type.contains("application/x-www-form-urlencoded") {
            ContentType::FormUrlEncoded
        } else if content_type.contains("text/")
            || content_type.contains("application/xml")
            || content_type.contains("application/javascript")
        {
            ContentType::Text
        } else if content_type.contains("application/octet-stream")
            || content_type.contains("image/")
            || content_type.contains("video/")
            || content_type.contains("audio/")
        {
            ContentType::Binary
        } else {
            ContentType::Unknown
        }
    }
}
