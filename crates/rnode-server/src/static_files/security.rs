use super::types::StaticOptions;

// Function for checking file security
pub fn is_file_safe(path: &std::path::Path, options: &StaticOptions) -> bool {
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
