use std::collections::HashMap;
use std::sync::OnceLock;
use tokio::sync::RwLock;
use uuid::Uuid;
use serde_json;
use chrono;
use log;
use futures_util::SinkExt;
use neon::context::Context;
use neon::prelude::*; 

use crate::websocket::WebSocketConnection;

// Алиасы для упрощения типов
type WebSocketSender = tokio::sync::Mutex<futures_util::stream::SplitSink<axum::extract::ws::WebSocket, axum::extract::ws::Message>>;
type SendersMap = HashMap<Uuid, WebSocketSender>;

// Глобальное хранилище для WebSocket отправителей
pub static WEBSOCKET_SENDERS: OnceLock<RwLock<SendersMap>> = OnceLock::new();

// Геттер для глобального состояния отправителей
pub fn get_websocket_senders() -> &'static RwLock<SendersMap> {
    WEBSOCKET_SENDERS.get_or_init(|| RwLock::new(HashMap::new()))
}

// Основные функции для работы с соединениями
pub async fn add_connection(connection_id: Uuid, connection: WebSocketConnection) {
    log::debug!("🔄 add_connection called for connection_id: {}", connection_id);
    
    // Extract path and room_id before moving connection
    let path = connection.path.clone();
    let room_id = connection.room_id.clone();
    
    let mut connections = crate::websocket::rooms::get_websocket_connections().write().await;
    log::debug!("📊 Got write lock on connections, current count: {}", connections.len());
    
    connections.insert(connection_id, connection);
    log::debug!("✅ Connection {} added (total connections: {})", connection_id, connections.len());
    
    // Record WebSocket connection metrics
    crate::metrics::record_websocket_connection_start(&connection_id, &path, room_id.as_deref());
}

pub async fn remove_connection(connection_id: &Uuid) {
    // Get connection info before removing
    let (path, room_id) = {
        let connections = crate::websocket::rooms::get_websocket_connections().read().await;
        if let Some(conn) = connections.get(connection_id) {
            (conn.path.clone(), conn.room_id.clone())
        } else {
            ("unknown".to_string(), None)
        }
    };
    
    // Удаляем соединение из комнаты
    if let Some(room_id_ref) = &room_id {
        crate::websocket::rooms::leave_room(connection_id, room_id_ref).await;
    }
    
    // Удаляем соединение
    let mut connections = crate::websocket::rooms::get_websocket_connections().write().await;
    connections.remove(connection_id);
    log::debug!("🗑️ Connection {} removed (remaining connections: {})", connection_id, connections.len());
    
    // Record WebSocket disconnection metrics
    crate::metrics::record_websocket_connection_end(connection_id, &path, room_id.as_deref());
}

pub async fn get_connection_info(connection_id: &Uuid) -> Option<WebSocketConnection> {
    let connections = crate::websocket::rooms::get_websocket_connections().read().await;
    connections.get(connection_id).cloned()
}

pub async fn update_connection_last_ping(connection_id: &Uuid) {
    if let Some(conn) = crate::websocket::rooms::get_websocket_connections().write().await.get_mut(connection_id) {
        conn.last_ping = chrono::Utc::now();
    }
}

pub async fn get_connection_room(connection_id: &Uuid) -> Option<String> {
    let connections = crate::websocket::rooms::get_websocket_connections().read().await;
    connections.get(connection_id).and_then(|conn| conn.room_id.clone())
}

// Функции для работы с отправителями
pub async fn add_sender(connection_id: Uuid, sender: WebSocketSender) {
    let mut senders = get_websocket_senders().write().await;
    senders.insert(connection_id, sender);
    log::debug!("💾 Sender saved for connection {} (total senders: {})", connection_id, senders.len());
}

pub async fn remove_sender(connection_id: &Uuid) {
    let mut senders = get_websocket_senders().write().await;
    senders.remove(connection_id);
    log::debug!("🗑️ Sender removed for connection {} (remaining senders: {})", connection_id, senders.len());
}

// Хелперы для форматирования сообщений
pub fn format_welcome_message(connection_id: &Uuid, client_id: &str, path: &str) -> serde_json::Value {
    serde_json::json!({
        "type": "welcome",
        "connection_id": connection_id.to_string(),
        "client_id": client_id,
        "path": path,
        "timestamp": chrono::Utc::now().to_rfc3339()
    })
}

pub fn format_ping_message() -> serde_json::Value {
    serde_json::json!({
        "type": "ping",
        "timestamp": chrono::Utc::now().to_rfc3339()
    })
}

pub fn format_pong_message() -> serde_json::Value {
    serde_json::json!({
        "type": "pong",
        "timestamp": chrono::Utc::now().to_rfc3339()
    })
}

pub fn format_room_joined_message(room_id: &str) -> serde_json::Value {
    serde_json::json!({
        "type": "room_joined",
        "room_id": room_id,
        "timestamp": chrono::Utc::now().to_rfc3339()
    })
}

pub fn format_room_left_message(room_id: &str) -> serde_json::Value {
    serde_json::json!({
        "type": "room_left",
        "room_id": room_id,
        "timestamp": chrono::Utc::now().to_rfc3339()
    })
}

pub fn format_room_message(room_id: &str, message: &str, from_client_id: &str) -> serde_json::Value {
    serde_json::json!({
        "type": "room_message",
        "room_id": room_id,
        "message": message,
        "from_client_id": from_client_id,
        "timestamp": chrono::Utc::now().to_rfc3339()
    })
}

pub fn format_message_ack(message: &str) -> serde_json::Value {
    serde_json::json!({
        "type": "message_ack",
        "message": message,
        "timestamp": chrono::Utc::now().to_rfc3339()
    })
}

pub fn format_error_message(error_type: &str, error: &str) -> serde_json::Value {
    serde_json::json!({
        "type": "error",
        "error_type": error_type,
        "error": error,
        "timestamp": chrono::Utc::now().to_rfc3339()
    })
}

// Функция для отправки сообщений напрямую клиенту
pub async fn send_direct_message(connection_id: &Uuid, message: &serde_json::Value) -> Result<(), String> {
    log::debug!("🔄 send_direct_message called for {}: {}", connection_id, message);
    
    let senders = get_websocket_senders();
    let senders_map = senders.read().await;
    
    log::debug!("📊 Found {} senders in map", senders_map.len());

    if let Some(sender_arc) = senders_map.get(connection_id) {
        log::debug!("✅ Sender found for connection {}", connection_id);
        let mut sender_guard = sender_arc.lock().await;
        
        let message_text = message.to_string();
        log::debug!("📤 Sending message: {}", message_text);
        
        // Determine message type before sending
        let message_type = if message_text.contains("welcome") { "welcome" } else if message_text.contains("error") { "error" } else { "text" };
        let message_size = message_text.len();
        
        if let Err(e) = sender_guard.send(axum::extract::ws::Message::Text(message_text.into())).await {
            log::error!("❌ Failed to send direct message to {}: {}", connection_id, e);
            return Err(format!("Failed to send message: {}", e));
        }
        
        log::debug!("✅ Message sent successfully to {}", connection_id);
        
        // Record message sent metric
        let connection_info = get_connection_info(connection_id).await;
        if let Some(conn) = connection_info {
            crate::metrics::record_websocket_message_sent(message_type, conn.room_id.as_deref(), &conn.path, message_size);
        }
        
        Ok(())
    } else {
        log::error!("❌ No sender found for connection_id: {}", connection_id);
        log::debug!("📋 Available connection IDs: {:?}", senders_map.keys().collect::<Vec<_>>());
        Err("No sender found".into())
    }
}

// Функция для отправки сообщений всем в комнате
pub async fn broadcast_to_room(room_id: &str, message: &serde_json::Value) -> Result<(), String> {
    let rooms = crate::websocket::rooms::get_websocket_rooms().read().await;
    
    log::debug!("📊 Broadcasting to room {}: found {} total rooms", room_id, rooms.len());
    log::debug!("📋 Available rooms: {:?}", rooms.keys().collect::<Vec<_>>());
    
    if let Some(room) = rooms.get(room_id) {
        log::debug!("✅ Room {} found with {} connections", room_id, room.connections.len());
        log::debug!("👥 Connections in room: {:?}", room.connections);
        
        for connection_id in &room.connections {
            log::debug!("🔄 Attempting to send room message to {}: {}", connection_id, message);
            if let Err(e) = send_direct_message(connection_id, &message).await {
                log::error!("❌ Failed to send room message to {}: {}", connection_id, e);
            } else {
                log::info!("✅ Room message sent to {}: {}", connection_id, message);
            }
        }
    } else {
        log::error!("❌ Room {} not found for broadcasting", room_id);
    }
    
    Ok(())
}

// Функция для вызова WebSocket колбеков на беке
pub async fn send_websocket_event(event_type: &str, connection_id: &Uuid, path: &str, _handler_id: &str, data: Option<&str>, client_id: Option<&str>) -> Result<Option<serde_json::Value>, String> {
    log::debug!("🔌 send_websocket_event called: type={}, connection_id={}, path={}, data={:?}, client_id={:?}", 
                event_type, connection_id, path, data, client_id);
    
    // Проверяем, включено ли событие для данного пути
    let routes = crate::websocket::get_websocket_routes();
    let routes_map = routes.read().await;
    
    if let Some(handler) = routes_map.get(path) {
        // Преобразуем название события в название колбека
        let callback_name = match event_type {
            "connect" => "onConnect",
            "message" => "onMessage", 
            "close" => "onClose",
            "error" => "onError",
            "join_room" => "onJoinRoom",
            "leave_room" => "onLeaveRoom",
            "ping" => "onPing",
            "pong" => "onPong",
            "binary_message" => "onBinaryMessage",
            _ => event_type
        };
        
        // Если колбек НЕ включен, пропускаем событие без обработки
        if !handler.enabled_events.contains(callback_name) {
            log::debug!("✅ Callback {} not configured for path {}, proceeding without processing {}", callback_name, path, event_type);
            return Ok(Some(serde_json::json!({"proceed": true}))); // Колбек не настроен, пропускаем обработку
        }
    } else {
        log::warn!("⚠️ No WebSocket handler found for path: {}", path);
        return Ok(Some(serde_json::json!({"proceed": true}))); // Нет обработчика, но пропускаем событие
    }
    
    // Вызываем onWebSocketEvent через global для вызова колбеков
    let channel = {
        let event_queue = crate::types::get_event_queue();
        let guard = event_queue.read().unwrap();
        guard.as_ref().cloned()
    };
    
    if let Some(channel) = channel {
        log::debug!("✅ Channel found, sending event to JavaScript");
        let mut event_data = serde_json::json!({
            "type": event_type,
            "connection_id": connection_id.to_string(),
            "path": path,
            "data": data
        });
        
        // Добавляем client_id если он предоставлен
        if let Some(cid) = client_id {
            event_data["client_id"] = serde_json::Value::String(cid.to_string());
        }
        
        log::debug!("📤 Event data prepared: {}", serde_json::to_string(&event_data).unwrap_or_default());
        
                // Отправляем событие через channel для вызова executeWebSocketEvent
        let event_data_clone = event_data.clone();
        let (tx, rx) = std::sync::mpsc::channel();
        
        let _ = channel.send(move |mut cx| {
            let global: Handle<JsObject> = cx.global("global")?;
            let execute_websocket_event_fn: Handle<JsFunction> =
                global.get(&mut cx, "executeWebSocketEvent")?;

            // Call executeWebSocketEvent function with timeout
            let result: Handle<JsValue> = execute_websocket_event_fn
                .call_with(&mut cx)
                .arg(cx.string(&event_data_clone.to_string()))
                .arg(cx.number(5000.0)) // 5 second timeout
                .apply(&mut cx)?;

            // Check if result is a Promise
            if result.is_a::<JsPromise, _>(&mut cx) {
                let promise: Handle<JsPromise> = result.downcast_or_throw(&mut cx)?;

                // Convert JavaScript Promise to Rust Future
                let promise_future = promise.to_future(&mut cx, |mut cx, result| {
                    // Get the promise's result value (or throw if it was rejected)
                    let value = result.or_throw(&mut cx)?;

                    // Convert the result to string
                    let result_string = value
                        .to_string(&mut cx)
                        .unwrap_or_else(|_| cx.string("Failed to convert promise result"));

                    Ok(result_string.value(&mut cx))
                })?;

                // Spawn a task to await the future
                let _channel = cx.channel();
                let tx_clone = tx.clone();

                // Spawn async task in separate thread
                let _thread_handle = std::thread::spawn(move || {
                    let rt = tokio::runtime::Builder::new_current_thread()
                        .enable_all()
                        .build()
                        .unwrap();

                    rt.block_on(async {
                        match promise_future.await {
                            Ok(result_string) => {
                                let _ = tx_clone.send(result_string);
                            }
                            Err(err) => {
                                let error_msg = format!("Promise failed: {:?}", err);
                                let _ = tx_clone.send(error_msg);
                            }
                        }
                    });
                });
            } else {
                // Not a promise, convert directly
                let result_string = result
                    .to_string(&mut cx)
                    .unwrap_or_else(|_| cx.string("Failed to handle WebSocket event result"));
                let _ = tx.send(result_string.value(&mut cx));
            }
            Ok(())
        });
        
        log::debug!("📤 Event sent to JavaScript channel, waiting for result...");
        
        // Ждем результат от JavaScript
        match rx.recv() {
            Ok(result_str) => {
                log::debug!("📥 Received result from JavaScript: {}", result_str);
                
                // Парсим результат из JavaScript
                let result_data: serde_json::Value = serde_json::from_str(&result_str).map_err(|e| format!("Failed to parse result: {}", e))?;
                
                log::debug!("🔍 Parsed result: shouldCancel={:?}, modifiedEvent={:?}", 
                           result_data.get("shouldCancel"), result_data.get("modifiedEvent"));
                
                // Проверяем shouldCancel и modifiedEvent
                if let Some(should_cancel) = result_data.get("shouldCancel").and_then(|v| v.as_bool()) {
                    if should_cancel {
                        log::info!("🚫 Event cancelled by JavaScript callback");
                        return Ok(None); // Событие отменено
                    }
                }
                
                if let Some(modified_event) = result_data.get("modifiedEvent") {
                    log::info!("🔄 Event modified by JavaScript callback");
                    return Ok(Some(modified_event.clone())); // Возвращаем измененное событие
                }
                
                log::debug!("✅ Event allowed by JavaScript callback");
                Ok(Some(event_data)) // Возвращаем оригинальное событие
            }
            Err(_) => {
                log::warn!("⚠️ Channel error, using original event data");
                // Ошибка канала - возвращаем оригинальное событие
                Ok(Some(event_data))
            }
        }
    } else {
        log::error!("❌ Channel not found, EVENT_QUEUE not initialized");
        Err("EVENT_QUEUE not initialized".to_string())
    }
}



// Функция для создания нового соединения
pub fn create_connection(
    connection_id: Uuid,
    client_id: String,
    path: String,
    handler_id: String,
) -> WebSocketConnection {
    WebSocketConnection {
        id: connection_id,
        client_id,
        path,
        room_id: None,
        handler_id,
        metadata: HashMap::new(),
        created_at: chrono::Utc::now(),
        last_ping: chrono::Utc::now(),
    }
}
// Эти функции теперь находятся в модуле rooms для лучшей интеграции

