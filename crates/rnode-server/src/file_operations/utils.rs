use mime_guess::MimeGuess;
use std::fs;
use std::path::Path;
use super::types::FileInfo;

// Recursive function for traversing directories
pub fn scan_directory(dir_path: &Path, base_dir: &Path) -> Result<Vec<FileInfo>, std::io::Error> {
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
