use neon::prelude::*;
use std::collections::HashMap;
use crate::types::get_static_files;

// Функция для загрузки статических файлов в память
pub fn load_static_files(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let static_path = cx.argument::<JsString>(0)?.value(&mut cx);
    
    println!("Loading static files from: {}", static_path);
    
    // Загружаем файлы в память
    let static_files = get_static_files();
    {
        let mut files_map = static_files.write().unwrap();
        
        // Рекурсивно обходим директорию
        fn load_directory(dir_path: &std::path::Path, base_path: &std::path::Path, files_map: &mut HashMap<String, (Vec<u8>, String)>) {
            if let Ok(entries) = std::fs::read_dir(dir_path) {
                for entry in entries {
                    if let Ok(entry) = entry {
                        let path = entry.path();
                        if path.is_file() {
                            if let Ok(content) = std::fs::read(&path) {
                                let url_path = format!("/{}", path.strip_prefix(base_path).unwrap().to_string_lossy());
                                let mime_type = get_mime_type(&path);
                                
                                let url_path_clone = url_path.clone();
                                let mime_type_clone = mime_type.clone();
                                files_map.insert(url_path, (content, mime_type));
                                println!("Loaded static file: {} ({})", url_path_clone, mime_type_clone);
                            }
                        } else if path.is_dir() {
                            // Рекурсивно загружаем подпапки
                            load_directory(&path, base_path, files_map);
                        }
                    }
                }
            }
        }
        
        load_directory(&std::path::Path::new(&static_path), &std::path::Path::new(&static_path), &mut files_map);
    }
    
    Ok(cx.undefined())
}

// Функция для определения MIME типа файла
pub fn get_mime_type(path: &std::path::Path) -> String {
    mime_guess::from_path(path)
        .first_or_octet_stream()
        .to_string()
}

// Функция для обработки статических файлов
pub async fn handle_static_file(path: String) -> Option<axum::response::Response<axum::body::Body>> {
    use axum::response::Response;
    use axum::body::Body;
    use axum::http::StatusCode;
    
    let static_files = get_static_files();
    let files_map = static_files.read().unwrap();
    
    // Проверяем точное совпадение пути
    if let Some((content, mime_type)) = files_map.get(&path) {
        Some(Response::builder()
            .status(StatusCode::OK)
            .header("content-type", mime_type)
            .body(Body::from(content.clone()))
            .unwrap())
    }
    // Если запрос к корню и есть index.html, возвращаем его
    else if path == "/" && files_map.contains_key("/index.html") {
        if let Some((content, mime_type)) = files_map.get("/index.html") {
            Some(Response::builder()
                .status(StatusCode::OK)
                .header("content-type", mime_type)
                .body(Body::from(content.clone()))
                .unwrap())
        } else {
            None
        }
    }
    // Если путь заканчивается на / и есть index.html в этой папке
    else if path.ends_with('/') && files_map.contains_key(&format!("{}index.html", path)) {
        if let Some((content, mime_type)) = files_map.get(&format!("{}index.html", path)) {
            Some(Response::builder()
                .status(StatusCode::OK)
                .header("content-type", mime_type)
                .body(Body::from(content.clone()))
                .unwrap())
        } else {
            None
        }
    }
    else {
        None
    }
}
