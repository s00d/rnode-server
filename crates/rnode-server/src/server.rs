use neon::prelude::*;
use axum::{
    routing::{get, post, put, delete, patch},
    Router,
};
use std::net::SocketAddr;
use crate::types::{get_routes, get_event_queue};
use crate::handlers::dynamic_handler;
use crate::static_files::handle_static_file;

// Функция для запуска сервера
pub fn start_listen(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let port = cx.argument::<JsNumber>(0)?.value(&mut cx) as u16;
    
    // Проверяем, есть ли второй аргумент (хост)
    let host = if cx.len() > 1 {
        if let Ok(host_arg) = cx.argument::<JsString>(1) {
            let host_str = host_arg.value(&mut cx);
            // Парсим IP адрес
            let ip_parts: Result<Vec<u8>, _> = host_str.split('.')
                .map(|part| part.parse::<u8>())
                .collect();
            
            match ip_parts {
                Ok(parts) if parts.len() == 4 => {
                    Some([parts[0], parts[1], parts[2], parts[3]])
                }
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
    println!("Starting server on {}:{}", host.iter().map(|b| b.to_string()).collect::<Vec<_>>().join("."), port);
    
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
