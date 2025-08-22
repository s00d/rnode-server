use crate::handlers::dynamic_handler;
use crate::static_files::handle_static_file;
use crate::types::{get_download_routes, get_event_queue, get_routes, get_upload_routes};
use axum::{
    Router,
    routing::{delete, get, patch, post, put},
};
use futures::stream::{self};
use mime_guess::MimeGuess;
use multer::Multipart;
use neon::prelude::*;
use serde_json;
use std::net::SocketAddr;

// Функция для запуска сервера
pub fn start_listen(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let port = cx.argument::<JsNumber>(0)?.value(&mut cx) as u16;

    // Проверяем, есть ли второй аргумент (хост)
    let host = if cx.len() > 1 {
        if let Ok(host_arg) = cx.argument::<JsString>(1) {
            let host_str = host_arg.value(&mut cx);
            // Парсим IP адрес
            let ip_parts: Result<Vec<u8>, _> =
                host_str.split('.').map(|part| part.parse::<u8>()).collect();

            match ip_parts {
                Ok(parts) if parts.len() == 4 => Some([parts[0], parts[1], parts[2], parts[3]]),
                _ => {
                    println!("Invalid IP address: {}, using localhost", host_str);
                    Some([127, 0, 0, 1])
                }
            }
        } else {
            Some([127, 0, 0, 1])
        }
    } else {
        Some([127, 0, 0, 1])
    };

    let host = host.unwrap();
    println!(
        "Starting server on {}:{}",
        host.iter()
            .map(|b| b.to_string())
            .collect::<Vec<_>>()
            .join("."),
        port
    );

    // Создаем Channel для связи с JavaScript
    let queue = cx.channel();

    // Сохраняем Channel в глобальной переменной
    {
        let event_queue_guard = get_event_queue();
        let mut event_queue_map = event_queue_guard.write().unwrap();
        *event_queue_map = Some(queue);
    }

    // Запускаем реальный HTTP сервер
    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            // Создаем базовый роутер
            let mut app = Router::new();
            
            // Добавляем динамические маршруты
            let routes = get_routes();
            let routes_map = routes.read().unwrap();
            
            // Создаем клоны для использования в замыканиях
            let routes_vec: Vec<(String, String, String)> = routes_map.iter()
                .map(|(_, route_info)| (route_info.path.clone(), route_info.method.clone(), route_info.handler_id.clone()))
                .collect();

            println!("Routes found: {:?}", routes_vec);
            
            for (path, method, handler_id) in routes_vec {
                let path_clone = path.clone();
                let method_clone = method.clone();
                let handler_id_clone = handler_id.clone();
                
                let handler_fn = move |req: axum::extract::Request| {
                    let registered_path = path_clone.clone();
                    let method = method_clone.clone();
                    let handler_id = handler_id_clone.clone();
                    async move { 
                        // Получаем фактический путь из запроса
                        let actual_path = req.uri().path().to_string();
                        dynamic_handler(req, actual_path, registered_path, method, handler_id).await 
                    }
                };
                
                match method.as_str() {
                    "GET" => app = app.route(&path, get(handler_fn)),
                    "POST" => app = app.route(&path, post(handler_fn)),
                    "PUT" => app = app.route(&path, put(handler_fn)),
                    "DELETE" => app = app.route(&path, delete(handler_fn)),
                    "PATCH" => app = app.route(&path, patch(handler_fn)),
                    _ => {}
                }
            }
            
            let addr = SocketAddr::from(([127, 0, 0, 1], port));
            println!("Server listening on http://{}", addr);
            println!("Registered dynamic routes:");
            for (_, route_info) in routes_map.iter() {
                println!("  {} {}", route_info.method, route_info.path);
            }
            
            // Освобождаем блокировку перед запуском сервера
            drop(routes_map);
            
            // Добавляем динамические роуты для скачивания файлов
            let download_routes = get_download_routes();
            let download_routes_map = download_routes.read().unwrap();
            
            for (route_path, config) in download_routes_map.iter() {
                let config_clone = config.clone();
                let route_path_clone = route_path.clone();
                
                let download_handler = move |req: axum::extract::Request| {
                    let config = config_clone.clone();
                    let route_path = route_path_clone.clone();
                    async move {
                        // Извлекаем путь к файлу из параметра {*name} или из query параметра ?path=
                        let actual_filename = {
                            let mut result = None;
                            
                            // Сначала проверяем параметр {*name} из пути
                            if route_path.contains("{*name}") {
                                // Извлекаем имя файла из URL
                                let path_parts: Vec<&str> = req.uri().path().split('/').collect();
                                if path_parts.len() >= 3 {
                                    let filename = path_parts[2..].join("/");
                                    if !filename.is_empty() {
                                        println!("📁 Файл для скачивания из параметра {{*name}}: '{}'", filename);
                                        result = Some(filename);
                                    }
                                }
                            }
                            
                            // Если имя файла не найдено в пути, проверяем query параметр ?path=
                            if result.is_none() {
                                if let Some(query) = req.uri().query() {
                                    let query_parts: Vec<&str> = query.split('&').collect();
                                    for part in query_parts {
                                        if part.starts_with("path=") {
                                            let path_value = &part[5..]; // Убираем "path="
                                            if !path_value.is_empty() {
                                                // Декодируем URL-encoded значения
                                                let decoded_value = match urlencoding::decode(path_value) {
                                                    Ok(decoded) => decoded.to_string(),
                                                    Err(_) => path_value.to_string(),
                                                };
                                                println!("📁 Файл для скачивания из query параметра ?path=: '{}'", decoded_value);
                                                result = Some(decoded_value);
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                            
                            // Если ничего не найдено, возвращаем ошибку
                            match result {
                                Some(filename) => filename,
                                None => {
                                    println!("❌ Не указан путь к файлу для скачивания");
                                    return Err(axum::http::StatusCode::BAD_REQUEST);
                                }
                            }
                        };
                        
                        let file_path = format!("{}/{}", config.folder, actual_filename);
                        
                        // Проверяем существование файла
                        if !std::path::Path::new(&file_path).exists() {
                            return Err(axum::http::StatusCode::NOT_FOUND);
                        }
                        
                        // Проверяем размер файла
                        if let Some(max_size) = config.max_file_size {
                            if let Ok(metadata) = std::fs::metadata(&file_path) {
                                if metadata.len() > max_size {
                                    return Err(axum::http::StatusCode::PAYLOAD_TOO_LARGE);
                                }
                            }
                        }
                        
                        // Проверяем расширение файла
                        if let Some(ref allowed_extensions) = config.allowed_extensions {
                            if let Some(extension) = std::path::Path::new(&actual_filename).extension() {
                                let ext_str = extension.to_string_lossy().to_lowercase();
                                if !allowed_extensions.iter().any(|allowed| {
                                    allowed.trim_start_matches('.').to_lowercase() == ext_str
                                }) {
                                    return Err(axum::http::StatusCode::FORBIDDEN);
                                }
                            }
                        }
                        
                        // Проверяем заблокированные пути
                        if let Some(ref blocked_paths) = config.blocked_paths {
                            for blocked_path in blocked_paths {
                                if actual_filename.contains(blocked_path) {
                                    return Err(axum::http::StatusCode::FORBIDDEN);
                                }
                            }
                        }
                        
                        // Проверяем скрытые и системные файлы
                        if !config.allow_hidden_files {
                            if actual_filename.starts_with('.') {
                                return Err(axum::http::StatusCode::FORBIDDEN);
                            }
                        }
                        
                        if !config.allow_system_files {
                            let system_files = ["thumbs.db", ".ds_store", "desktop.ini"];
                            if system_files.iter().any(|&sys_file| {
                                actual_filename.to_lowercase() == sys_file.to_lowercase()
                            }) {
                                return Err(axum::http::StatusCode::FORBIDDEN);
                            }
                        }
                        
                        // Открываем файл для чтения
                        if let Ok(file) = tokio::fs::File::open(&file_path).await {
                            let metadata = file.metadata().await.unwrap_or_else(|_| std::fs::metadata(&file_path).unwrap());
                            
                            // Определяем MIME тип
                            let mime_type = if let Some(kind) = infer::get(&std::fs::read(&file_path).unwrap_or_default()) {
                                kind.mime_type().to_string()
                            } else {
                                mime_guess::MimeGuess::from_path(&file_path).first_or_octet_stream().to_string()
                            };
                            
                            let stream = tokio_util::io::ReaderStream::new(file);
                            let body = axum::body::Body::from_stream(stream);
                            
                            let mut response = axum::response::Response::new(body);
                            response.headers_mut().insert("content-type", mime_type.parse().unwrap());
                            response.headers_mut().insert("content-disposition", format!("attachment; filename=\"{}\"", actual_filename).parse().unwrap());
                            response.headers_mut().insert("content-length", metadata.len().to_string().parse().unwrap());
                            
                            // Кастомные заголовки пока не поддерживаются
                            
                            Ok(response)
                        } else {
                            Err(axum::http::StatusCode::NOT_FOUND)
                        }
                    }
                };
                
                // Регистрируем роут (поддерживаем wildcard для подпапок)
                let actual_route = route_path.clone();
                app = app.route(&actual_route, get(download_handler));
                println!("📥 Зарегистрирован роут скачивания: {} -> {}", route_path, actual_route);
            }
            
            // Освобождаем блокировку
            drop(download_routes_map);
            
            // Добавляем роуты для загрузки файлов
            let upload_routes = get_upload_routes();
            let upload_routes_map = upload_routes.read().unwrap();
            
            for (route_path, config) in upload_routes_map.iter() {
                let config_clone = config.clone();
                let route_path_clone = route_path.clone();
                
                let upload_handler = move |req: axum::extract::Request| {
                        let config = config_clone.clone();
                        let route_path = route_path_clone.clone();
                        async move {
                            println!("📤 Загрузка файла через роут: {}", route_path);

                            // Функция для проверки wildcard паттерна
                            fn matches_pattern(pattern: &str, path: &str) -> bool {
                                if pattern == path {
                                    return true; // Точное совпадение
                                }

                                if pattern == "*" {
                                    // Паттерн "*" разрешает любую подпапку
                                    return true;
                                }

                                if pattern.ends_with("/*") {
                                    // Паттерн типа "documents/*"
                                    let prefix = &pattern[..pattern.len() - 2];
                                    if path.starts_with(prefix) {
                                        // Проверяем что это подпапка, а не файл
                                        if path.len() > prefix.len() && path.chars().nth(prefix.len()) == Some('/') {
                                            return true;
                                        }
                                    }
                                }

                                false
                            }

                            // Извлекаем subfolder из параметра {*subfolder} или из query параметра ?dir=
                            let subfolder_from_url = {
                                let mut result = None;

                                // Сначала проверяем параметр {*subfolder} из пути
                                if route_path.contains("{*subfolder}") {
                                    // Извлекаем subfolder из реального URL запроса
                                    let request_path = req.uri().path();
                                    let path_parts: Vec<&str> = request_path.split('/').collect();

                                    // Если путь содержит /upload/ или /upload-multiple/, извлекаем subfolder
                                    if (request_path.starts_with("/upload/") || request_path.starts_with("/upload-multiple/")) && path_parts.len() >= 3 {
                                        let subfolder = path_parts[2..].join("/");
                                        if !subfolder.is_empty() {
                                            println!("📁 Подпапка из параметра {{*subfolder}}: '{}'", subfolder);
                                            result = Some(subfolder);
                                        }
                                    }
                                }

                                // Если subfolder не найден в пути, проверяем query параметр ?dir=
                                if result.is_none() {
                                    if let Some(query) = req.uri().query() {
                                        // Парсим query параметры
                                        let query_parts: Vec<&str> = query.split('&').collect();
                                        for part in query_parts {
                                            if part.starts_with("dir=") {
                                                let dir_value = &part[4..]; // Убираем "dir="
                                                if !dir_value.is_empty() {
                                                    // Декодируем URL-encoded значения
                                                    let decoded_value = match urlencoding::decode(dir_value) {
                                                        Ok(decoded) => decoded.to_string(),
                                                        Err(_) => dir_value.to_string(),
                                                    };
                                                    println!("📁 Подпапка из query параметра: '{}' (декодированная: '{}')", dir_value, decoded_value);
                                                    result = Some(decoded_value);
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }

                                result
                            };

                            // Получаем Content-Type для определения boundary
                            let content_type = req.headers()
                                .get("content-type")
                                .and_then(|h| h.to_str().ok())
                                .unwrap_or("")
                                .to_string();

                            if !content_type.contains("multipart/form-data") {
                                return axum::response::Response::builder()
                                    .status(axum::http::StatusCode::BAD_REQUEST)
                                    .body(axum::body::Body::from("Content-Type must be multipart/form-data"))
                                    .unwrap();
                            }

                            // Извлекаем boundary
                            let boundary = content_type
                                .split("boundary=")
                                .nth(1)
                                .unwrap_or("boundary");

                            // Получаем body
                            let body_bytes = match axum::body::to_bytes(req.into_body(), usize::MAX).await {
                                Ok(bytes) => bytes,
                                Err(_) => {
                                    return axum::response::Response::builder()
                                        .status(axum::http::StatusCode::BAD_REQUEST)
                                        .body(axum::body::Body::from("Failed to read request body"))
                                        .unwrap();
                                }
                            };

                            // Создаем stream для multer
                            let stream = stream::once(async move {
                                Result::<axum::body::Bytes, std::io::Error>::Ok(body_bytes)
                            });

                            // Создаем Multipart
                            let mut multipart = Multipart::new(stream, boundary);

                            let mut uploaded_files = Vec::new();
                            let mut form_fields = std::collections::HashMap::new();
                            // Используем subfolder из query параметра
                            let subfolder_from_form = subfolder_from_url;

                            // Структура для информации о файлах
                            #[derive(serde::Serialize)]
                            struct FileInfo {
                                name: String,
                                size: u64,
                                mime_type: String,
                                relative_path: String,
                            }

                            // Обрабатываем все поля и файлы в одном цикле
                            loop {
                                match multipart.next_field().await {
                                    Ok(Some(field)) => {
                                        let field_name = field.name().unwrap_or("unknown").to_string();

                                        if let Some(filename) = field.file_name() {
                                        // Это файл - обрабатываем сразу
                                        let filename = filename.to_string();
                                        println!("📄 Обрабатываем файл: '{}'", filename);

                                        // Проверяем что подпапка разрешена
                                        let upload_folder = if let Some(ref subfolder) = subfolder_from_form {
                                            println!("📁 Используем подпапку из query параметра: '{}'", subfolder);
                                            // Проверяем что подпапка разрешена с поддержкой wildcard
                                            if let Some(ref allowed_subfolders) = config.allowed_subfolders {
                                                println!("📁 Проверяем разрешенные подпапки: {:?}", allowed_subfolders);

                                                let is_allowed = allowed_subfolders.iter().any(|allowed| {
                                                    matches_pattern(allowed, subfolder)
                                                });

                                                if !is_allowed {
                                                    println!("❌ Подпапка '{}' не разрешена", subfolder);
                                                    return axum::response::Response::builder()
                                                        .status(axum::http::StatusCode::FORBIDDEN)
                                                        .body(axum::body::Body::from(format!("Subfolder '{}' not allowed", subfolder)))
                                                        .unwrap();
                                                }
                                                println!("✅ Подпапка '{}' разрешена", subfolder);
                                            }
                                            let folder = format!("{}/{}", config.folder, subfolder);
                                            println!("📁 Полная папка для загрузки: '{}'", folder);
                                            folder
                                        } else {
                                            println!("📁 Подпапка не указана, используем корневую: '{}'", config.folder);
                                            config.folder.clone()
                                        };

                                        // Создаем относительный путь к файлу
                                        let relative_path = if let Some(ref subfolder) = subfolder_from_form {
                                            let path = format!("{}/{}", subfolder, filename);
                                            println!("📁 Относительный путь к файлу: '{}'", path);
                                            path
                                        } else {
                                            println!("📁 Относительный путь (без подпапки): '{}'", filename);
                                            filename.clone()
                                        };

                                        // Проверяем расширение
                                        if let Some(ref allowed_extensions) = config.allowed_extensions {
                                            if let Some(extension) = std::path::Path::new(&filename).extension() {
                                                let ext_str = extension.to_string_lossy().to_lowercase();
                                                if !allowed_extensions.iter().any(|allowed| {
                                                    allowed.trim_start_matches('.').to_lowercase() == ext_str
                                                }) {
                                                    return axum::response::Response::builder()
                                                        .status(axum::http::StatusCode::FORBIDDEN)
                                                        .body(axum::body::Body::from(format!("File extension .{} not allowed", ext_str)))
                                                        .unwrap();
                                                }
                                            }
                                        }

                                        // Определяем MIME тип через mime_guess
                                        let mime_type = MimeGuess::from_path(&filename)
                                            .first_or_octet_stream()
                                            .to_string();

                                        // Проверяем MIME тип для безопасности
                                        if let Some(ref allowed_mime_types) = config.allowed_mime_types {
                                            if !allowed_mime_types.contains(&mime_type) {
                                                return axum::response::Response::builder()
                                                    .status(axum::http::StatusCode::FORBIDDEN)
                                                    .body(axum::body::Body::from(format!("MIME type {} not allowed", mime_type)))
                                                    .unwrap();
                                            }
                                        }

                                        // Читаем содержимое файла
                                        let data = match field.bytes().await {
                                            Ok(data) => data,
                                            Err(_) => {
                                                return axum::response::Response::builder()
                                                    .status(axum::http::StatusCode::BAD_REQUEST)
                                                    .body(axum::body::Body::from("Failed to read file data"))
                                                    .unwrap();
                                            }
                                        };

                                        // Проверяем размер файла
                                        if let Some(max_size) = config.max_file_size {
                                            if data.len() as u64 > max_size {
                                                return axum::response::Response::builder()
                                                    .status(axum::http::StatusCode::PAYLOAD_TOO_LARGE)
                                                    .body(axum::body::Body::from(format!("File size {} exceeds limit {}", data.len(), max_size)))
                                                    .unwrap();
                                            }
                                        }

                                        // Проверяем перезапись
                                        let file_path = format!("{}/{}", upload_folder, filename);
                                        if !config.overwrite && std::path::Path::new(&file_path).exists() {
                                            return axum::response::Response::builder()
                                                .status(axum::http::StatusCode::CONFLICT)
                                                .body(axum::body::Body::from(format!("File {} already exists", relative_path)))
                                                .unwrap();
                                        }

                                        // Создаем папку если её нет
                                        println!("📁 Создаем папку: '{}'", upload_folder);
                                        if let Err(e) = std::fs::create_dir_all(&upload_folder) {
                                            println!("❌ Ошибка создания папки '{}': {}", upload_folder, e);
                                            return axum::response::Response::builder()
                                                .status(axum::http::StatusCode::INTERNAL_SERVER_ERROR)
                                                .body(axum::body::Body::from(format!("Failed to create upload directory: {}", e)))
                                            .unwrap();
                                        }
                                        println!("✅ Папка создана успешно: '{}'", upload_folder);

                                        // Сохраняем файл
                                        println!("💾 Сохраняем файл в: '{}'", file_path);
                                        if let Err(e) = std::fs::write(&file_path, &data) {
                                            println!("❌ Ошибка сохранения файла '{}': {}", file_path, e);
                                            return axum::response::Response::builder()
                                                .status(axum::http::StatusCode::INTERNAL_SERVER_ERROR)
                                                .body(axum::body::Body::from(format!("Failed to save file: {}", e)))
                                                .unwrap();
                                        }
                                        println!("✅ Файл сохранен успешно: '{}'", file_path);

                                        // Проверяем количество файлов в зависимости от типа загрузки
                                        if config.multiple {
                                            // Для множественной загрузки проверяем maxFiles
                                            if let Some(max_files) = config.max_files {
                                                if uploaded_files.len() >= max_files as usize {
                                                    return axum::response::Response::builder()
                                                        .status(axum::http::StatusCode::PAYLOAD_TOO_LARGE)
                                                        .body(axum::body::Body::from(format!("Maximum number of files ({}) exceeded", max_files)))
                                                        .unwrap();
                                                }
                                            }
                                        } else {
                                            // Для одиночной загрузки разрешаем только 1 файл
                                            if uploaded_files.len() >= 1 {
                                                return axum::response::Response::builder()
                                                    .status(axum::http::StatusCode::BAD_REQUEST)
                                                    .body(axum::body::Body::from("Single file upload route received multiple files"))
                                                    .unwrap();
                                            }
                                        }

                                        // Создаем информацию о файле
                                        let file_info = FileInfo {
                                            name: filename.clone(),
                                            size: data.len() as u64,
                                            mime_type: mime_type.clone(),
                                            relative_path,
                                        };

                                        uploaded_files.push(file_info);
                                        println!("💾 Файл сохранен: {} ({} байт, {})", file_path, data.len(), mime_type);
                                    } else {
                                        // Это обычное поле формы
                                        let value = field.text().await.unwrap_or_else(|_| String::new());
                                        println!("📝 Поле формы: '{}' = '{}'", field_name, value);
                                        form_fields.insert(field_name, value);
                                    }
                                }
                                Ok(None) => break, // Конец multipart данных
                                Err(_) => break, // Ошибка парсинга
                            }
                        }

                        // Формируем ответ
                        let response = serde_json::json!({
                            "success": true,
                            "message": "File uploaded successfully",
                            "uploadedFiles": uploaded_files,
                            "formFields": form_fields,
                            "totalFiles": uploaded_files.len()
                        });

                        axum::response::Response::builder()
                            .status(axum::http::StatusCode::OK)
                            .header("content-type", "application/json")
                            .body(axum::body::Body::from(response.to_string()))
                            .unwrap()
                    }
                };
                    
                // Регистрируем роут
                app = app.route(route_path, post(upload_handler));
                println!("📤 Зарегистрирован роут загрузки: {}", route_path);
            }
            
            // Освобождаем блокировку
            drop(upload_routes_map);
            
            // Добавляем fallback маршрут для статических файлов и несуществующих маршрутов
            let app = app.fallback(|req: axum::http::Request<axum::body::Body>| async move {
                let path = req.uri().path().to_string();
                
                // Сначала пробуем найти статический файл
                let accept_encoding = req.headers().get("accept-encoding").and_then(|h| h.to_str().ok());
                if let Some(static_response) = handle_static_file(path, accept_encoding).await {
                    return static_response;
                }
                
                // Если статический файл не найден, возвращаем 404
                axum::response::Response::builder()
                    .status(axum::http::StatusCode::NOT_FOUND)
                    .body(axum::body::Body::from("Not Found"))
                    .unwrap()
            });
            
            let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
            axum::serve(listener, app).await.unwrap();
        });
    });

    // Даем серверу время на запуск
    std::thread::sleep(std::time::Duration::from_millis(100));

    Ok(cx.undefined())
}
