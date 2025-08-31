// Structure for file information
#[derive(Debug, serde::Serialize)]
pub struct FileInfo {
    pub name: String,
    pub size: u64,
    pub created: String,
    pub modified: String,
    pub mime_type: String,
    pub path: String,
    pub relative_path: String,
}
