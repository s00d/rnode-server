use crate::types::{
    DownloadRouteConfig, UploadRouteConfig, get_download_routes, get_upload_routes,
};
use base64::Engine;
use infer;
use mime_guess::MimeGuess;
use neon::prelude::*;
use serde_json;
use std::fs;
use std::path::Path;

// Структура для информации о файле
#[derive(Debug, serde::Serialize)]
struct FileInfo {
    name: String,
    size: u64,
    created: String,
    modified: String,
    mime_type: String,
    path: String,
    relative_path: String,
}

// Функция для сохранения файла
pub fn save_file(mut cx: FunctionContext) -> JsResult<JsString> {
    let filename = cx.argument::<JsString>(0)?.value(&mut cx);
    let base64_data = cx.argument::<JsString>(1)?.value(&mut cx);
    let uploads_dir = cx.argument::<JsString>(2)?.value(&mut cx);

    // Создаем папку uploads если её нет
    if !Path::new(&uploads_dir).exists() {
        if let Err(e) = fs::create_dir_all(&uploads_dir) {
            return Ok(cx.string(format!(
                "{{\"success\":false,\"error\":\"Failed to create directory: {}\"}}",
                e
            )));
        }
    }

    let file_path = format!("{}/{}", uploads_dir, filename);

    // Декодируем Base64 и сохраняем файл
    match base64::engine::general_purpose::STANDARD.decode(&base64_data) {
        Ok(file_data) => {
            match fs::write(&file_path, file_data) {
                Ok(_) => {
                    println!("💾 File saved: {}", file_path);
                    Ok(cx.string(format!("{{\"success\":true,\"message\":\"File saved successfully\",\"path\":\"{}\"}}", file_path)))
                }
                Err(e) => Ok(cx.string(format!(
                    "{{\"success\":false,\"error\":\"Failed to write file: {}\"}}",
                    e
                ))),
            }
        }
        Err(e) => Ok(cx.string(format!(
            "{{\"success\":false,\"error\":\"Failed to decode base64: {}\"}}",
            e
        ))),
    }
}

// Функция для удаления файла
pub fn delete_file(mut cx: FunctionContext) -> JsResult<JsString> {
    let filename = cx.argument::<JsString>(0)?.value(&mut cx);
    let uploads_dir = cx.argument::<JsString>(1)?.value(&mut cx);

    let file_path = format!("{}/{}", uploads_dir, filename);

    if Path::new(&file_path).exists() {
        match fs::remove_file(&file_path) {
            Ok(_) => {
                println!("🗑️ File deleted: {}", file_path);
                Ok(cx.string(format!(
                    "{{\"success\":true,\"message\":\"File {} deleted successfully\"}}",
                    filename
                )))
            }
            Err(e) => Ok(cx.string(format!(
                "{{\"success\":false,\"error\":\"Failed to delete file: {}\"}}",
                e
            ))),
        }
    } else {
        Ok(cx.string(format!(
            "{{\"success\":false,\"error\":\"File not found\"}}"
        )))
    }
}

// Функция для получения списка файлов с подпапками
pub fn list_files(mut cx: FunctionContext) -> JsResult<JsString> {
    let uploads_dir = cx.argument::<JsString>(0)?.value(&mut cx);

    if !Path::new(&uploads_dir).exists() {
        return Ok(cx.string("{\"success\":true,\"files\":[],\"folders\":[],\"total\":0}"));
    }

    // Рекурсивная функция для обхода директорий
    fn scan_directory(dir_path: &Path, base_dir: &Path) -> Result<Vec<FileInfo>, std::io::Error> {
        let mut files = Vec::new();

        if let Ok(entries) = fs::read_dir(dir_path) {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();

                    if path.is_file() {
                        if let Ok(metadata) = fs::metadata(&path) {
                            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                                // Вычисляем относительный путь от базовой директории
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
                        // Рекурсивно обходим подпапки
                        if let Ok(sub_files) = scan_directory(&path, base_dir) {
                            files.extend(sub_files);
                        }
                    }
                }
            }
        }

        Ok(files)
    }

    match scan_directory(Path::new(&uploads_dir), Path::new(&uploads_dir)) {
        Ok(files) => {
            let result = serde_json::json!({
                "success": true,
                "files": files.iter().map(|f| {
                    serde_json::json!({
                        "name": f.name,
                        "size": f.size,
                        "created": f.created,
                        "modified": f.modified,
                        "mime_type": f.mime_type,
                        "path": f.path,
                        "relative_path": f.relative_path
                    })
                }).collect::<Vec<_>>(),
                "total": files.len()
            });

            Ok(cx.string(result.to_string()))
        }
        Err(e) => Ok(cx.string(format!(
            "{{\"success\":false,\"error\":\"Failed to scan directory: {}\"}}",
            e
        ))),
    }
}

// Функция для получения содержимого файла
pub fn get_file_content(mut cx: FunctionContext) -> JsResult<JsString> {
    let filename = cx.argument::<JsString>(0)?.value(&mut cx);
    let uploads_dir = cx.argument::<JsString>(1)?.value(&mut cx);

    let file_path = format!("{}/{}", uploads_dir, filename);

    if Path::new(&file_path).exists() {
        match fs::read(&file_path) {
            Ok(content) => {
                // Кодируем в Base64 для передачи в JavaScript
                let base64_content = base64::engine::general_purpose::STANDARD.encode(&content);
                // Определяем MIME тип из содержимого файла
                let mime_type = if let Some(kind) = infer::get(&content) {
                    kind.mime_type().to_string()
                } else {
                    // Fallback к определению по расширению
                    MimeGuess::from_path(&file_path)
                        .first_or_octet_stream()
                        .to_string()
                };

                let result = serde_json::json!({
                    "success": true,
                    "content": base64_content,
                    "size": content.len(),
                    "filename": filename,
                    "mime_type": mime_type
                });

                Ok(cx.string(result.to_string()))
            }
            Err(e) => Ok(cx.string(format!(
                "{{\"success\":false,\"error\":\"Failed to read file: {}\"}}",
                e
            ))),
        }
    } else {
        Ok(cx.string("{\"success\":false,\"error\":\"File not found\"}"))
    }
}

// Функция для проверки существования файла
pub fn file_exists(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let filename = cx.argument::<JsString>(0)?.value(&mut cx);
    let uploads_dir = cx.argument::<JsString>(1)?.value(&mut cx);

    let file_path = format!("{}/{}", uploads_dir, filename);
    let exists = Path::new(&file_path).exists();

    Ok(cx.boolean(exists))
}

// Функция для скачивания файла
pub fn download_file(mut cx: FunctionContext) -> JsResult<JsString> {
    let filename = cx.argument::<JsString>(0)?.value(&mut cx);
    let uploads_dir = cx.argument::<JsString>(1)?.value(&mut cx);

    let file_path = format!("{}/{}", uploads_dir, filename);

    if Path::new(&file_path).exists() {
        match fs::read(&file_path) {
            Ok(content) => {
                // Возвращаем содержимое файла как base64 строку
                let base64_content = base64::engine::general_purpose::STANDARD.encode(&content);
                Ok(cx.string(base64_content))
            }
            Err(_) => Ok(cx.string("")),
        }
    } else {
        Ok(cx.string(""))
    }
}

// Функция для регистрации роута скачивания файлов
pub fn register_download_route(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let path = cx.argument::<JsString>(0)?.value(&mut cx);
    let options_json = cx.argument::<JsString>(1)?.value(&mut cx);

    // Парсим опции
    if let Ok(options) = serde_json::from_str::<serde_json::Value>(&options_json) {
        let folder = options["folder"]
            .as_str()
            .unwrap_or("./uploads")
            .to_string();
        let max_file_size = options["maxFileSize"].as_u64();

        // Парсим массивы
        let allowed_extensions = options["allowedExtensions"].as_array().map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .map(|s| s.to_string())
                .collect::<Vec<String>>()
        });

        let blocked_paths = options["blockedPaths"].as_array().map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .map(|s| s.to_string())
                .collect::<Vec<String>>()
        });

        let allow_hidden = options["allowHiddenFiles"].as_bool().unwrap_or(false);
        let allow_system = options["allowSystemFiles"].as_bool().unwrap_or(false);

        // Создаем конфигурацию
        let config = DownloadRouteConfig {
            path: path.clone(),
            folder: folder.clone(),
            max_file_size,
            allowed_extensions: allowed_extensions.clone(),
            blocked_paths: blocked_paths.clone(),
            allow_hidden_files: allow_hidden,
            allow_system_files: allow_system,
        };

        // Сохраняем в глобальное хранилище
        let download_routes = get_download_routes();
        download_routes
            .write()
            .unwrap()
            .insert(path.clone(), config);

        println!("📥 Регистрируем роут скачивания: {} -> {}", path, folder);
        println!("   Максимальный размер: {:?} байт", max_file_size);
        println!("   Разрешенные расширения: {:?}", allowed_extensions);
        println!("   Заблокированные пути: {:?}", blocked_paths);
        println!("   Разрешить скрытые файлы: {}", allow_hidden);
        println!("   Разрешить системные файлы: {}", allow_system);

        // Выводим текущие зарегистрированные роуты
        let routes = download_routes.read().unwrap();
        println!(
            "📋 Всего зарегистрировано роутов скачивания: {}",
            routes.len()
        );
        for (route_path, _) in routes.iter() {
            println!("   - {}", route_path);
        }
    }

    Ok(cx.undefined())
}

// Функция для регистрации роута загрузки файлов (одиночная или множественная)
pub fn register_upload_route(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let path = cx.argument::<JsString>(0)?.value(&mut cx);
    let options_json = cx.argument::<JsString>(1)?.value(&mut cx);

    // Парсим опции
    if let Ok(options) = serde_json::from_str::<serde_json::Value>(&options_json) {
        let folder = options["folder"]
            .as_str()
            .unwrap_or("./uploads")
            .to_string();
        let allowed_subfolders = options["allowedSubfolders"].as_array().map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .map(|s| s.to_string())
                .collect::<Vec<String>>()
        });
        let max_file_size = options["maxFileSize"].as_u64();

        // Парсим массивы
        let allowed_extensions = options["allowedExtensions"].as_array().map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .map(|s| s.to_string())
                .collect::<Vec<String>>()
        });

        let allowed_mime_types = options["allowedMimeTypes"].as_array().map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .map(|s| s.to_string())
                .collect::<Vec<String>>()
        });

        let max_files = options["maxFiles"].as_u64().map(|v| v as u32);
        let overwrite = options["overwrite"].as_bool().unwrap_or(false);
        let multiple = options["multiple"].as_bool().unwrap_or(false);

        // Создаем конфигурацию для загрузки файлов
        let config = UploadRouteConfig {
            path: path.clone(),
            folder: folder.clone(),
            allowed_subfolders: allowed_subfolders.clone(),
            max_file_size,
            allowed_extensions: allowed_extensions.clone(),
            allowed_mime_types: allowed_mime_types.clone(),
            multiple,
            max_files,
            overwrite,
        };

        // Сохраняем в глобальное хранилище
        let upload_routes = get_upload_routes();
        upload_routes.write().unwrap().insert(path.clone(), config);

        println!("📤 Регистрируем роут загрузки: {} -> {}", path, folder);
        println!("   Разрешенные подпапки: {:?}", allowed_subfolders);
        println!("   Максимальный размер: {:?} байт", max_file_size);
        println!("   Разрешенные расширения: {:?}", allowed_extensions);
        println!("   Разрешенные MIME типы: {:?}", allowed_mime_types);
        println!("   Максимальное количество файлов: {:?}", max_files);
        println!("   Разрешить перезапись: {}", overwrite);
        println!("   Множественная загрузка: {}", multiple);

        // Выводим текущие зарегистрированные роуты
        let routes = upload_routes.read().unwrap();
        println!(
            "📋 Всего зарегистрировано роутов загрузки: {}",
            routes.len()
        );
        for (route_path, _) in routes.iter() {
            println!("   - {}", route_path);
        }
    }

    Ok(cx.undefined())
}
