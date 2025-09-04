use std::collections::HashMap;
use std::sync::OnceLock;
use tokio::sync::RwLock;
use uuid::Uuid;
use serde::{Serialize, Deserialize};
use log;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketConnection {
    pub id: Uuid,
    pub client_id: String,  // ID клиента для удобной работы с каналами
    pub path: String,
    pub room_id: Option<String>,
    pub handler_id: String,
    pub metadata: HashMap<String, String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_ping: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone)]
pub struct WebSocketHandler {
    pub enabled_events: std::collections::HashSet<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Room {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub max_connections: Option<u32>,
    pub connections: Vec<Uuid>,
    pub metadata: HashMap<String, String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

// Глобальные хранилища
pub static WEBSOCKET_ROUTES: OnceLock<RwLock<HashMap<String, WebSocketHandler>>> = OnceLock::new();

pub fn get_websocket_routes() -> &'static RwLock<HashMap<String, WebSocketHandler>> {
    WEBSOCKET_ROUTES.get_or_init(|| RwLock::new(HashMap::new()))
}

pub mod router;
pub mod upgrade;
pub mod rooms;
pub mod connections;

// FFI функции для Node.js
use neon::prelude::*;
use neon::context::Context;

// Функция для регистрации WebSocket роута
pub fn register_websocket(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let path = cx.argument::<JsString>(0)?.value(&mut cx);
    
    // Get list of enabled events (optional)
    let enabled_events_json = cx.argument::<JsString>(1).ok().map(|s| s.value(&mut cx));
    
    let enabled_events = if let Some(json_str) = enabled_events_json {
        if let Ok(events) = serde_json::from_str::<Vec<String>>(&json_str) {
            events.into_iter().collect()
        } else {
            std::collections::HashSet::new()
        }
    } else {
        std::collections::HashSet::new()
    };
    
    let handler = WebSocketHandler { enabled_events: enabled_events.clone() };
    
    let routes = get_websocket_routes();
    let mut routes_map = routes.blocking_write();
    routes_map.insert(path.clone(), handler);
    
    log::info!("🔧 WebSocket route registered: {} with enabled events: {:?}", path, enabled_events);
    
    Ok(cx.undefined())
}

// Функция для создания комнаты
pub fn create_room(mut cx: FunctionContext) -> JsResult<JsString> {
    let name = cx.argument::<JsString>(0)?.value(&mut cx);
    let _description = cx.argument::<JsString>(1).ok().map(|s| s.value(&mut cx));
    
    // Safely get max_connections with type checking
    let _max_connections = if let Some(arg) = cx.argument_opt(2) {
        if arg.is_a::<JsNumber, _>(&mut cx) {
            match arg.downcast::<JsNumber, _>(&mut cx) {
                Ok(num) => Some(num.value(&mut cx) as u32),
                Err(_) => None
            }
        } else {
            None
        }
    } else {
        None
    };
    
    let room_id = format!("room_{}", Uuid::new_v4().to_string().replace("-", ""));
    
    // Используем функцию из модуля rooms
    if let Ok(rt) = tokio::runtime::Runtime::new() {
        let _ = rt.block_on(async {
            let _ = crate::websocket::rooms::create_room(&room_id, &name, None).await;
        });
    }
    
    Ok(cx.string(room_id))
}

// Функция для отправки сообщения в комнату
pub fn send_room_message(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let room_id = cx.argument::<JsString>(0)?.value(&mut cx);
    let message = cx.argument::<JsString>(1)?.value(&mut cx);
    
    // Отправляем сообщение в комнату синхронно
    if let Ok(rt) = tokio::runtime::Runtime::new() {
        let _ = rt.block_on(async {
            if let Err(e) = crate::websocket::connections::broadcast_to_room(&room_id, &serde_json::json!({
                "type": "room_message",
                "room_id": room_id,
                "message": message,
                "timestamp": chrono::Utc::now().to_rfc3339()
            })).await {
                log::error!("Failed to send room message: {}", e);
            }
        });
    }
    
    Ok(cx.boolean(true))
}

// Функция для получения информации о комнате
pub fn get_room_info(mut cx: FunctionContext) -> JsResult<JsObject> {
    let room_id = cx.argument::<JsString>(0)?.value(&mut cx);
    
    // Используем функцию из модуля rooms
    if let Ok(rt) = tokio::runtime::Runtime::new() {
        let room = rt.block_on(async {
            crate::websocket::rooms::get_room_info(&room_id).await
        });
        
        let result = cx.empty_object();
        
        if let Some(room) = room {
            let id_prop = cx.string(room.id);
            let name_prop = cx.string(room.name);
            let connections_count = cx.number(room.connections.len() as f64);
            let created_at = cx.string(room.created_at.to_rfc3339());
            
            result.set(&mut cx, "id", id_prop)?;
            result.set(&mut cx, "name", name_prop)?;
            result.set(&mut cx, "connectionsCount", connections_count)?;
            result.set(&mut cx, "createdAt", created_at)?;
        }
        
        Ok(result)
    } else {
        Ok(cx.empty_object())
    }
}

// Функция для входа в комнату
pub fn join_room(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let connection_id = cx.argument::<JsString>(0)?.value(&mut cx);
    let room_id = cx.argument::<JsString>(1)?.value(&mut cx);
    
    // Parse connection_id to Uuid
    let connection_uuid = match Uuid::parse_str(&connection_id) {
        Ok(uuid) => uuid,
        Err(_) => return Ok(cx.boolean(false)),
    };
    
    // Join room синхронно
    if let Ok(rt) = tokio::runtime::Runtime::new() {
        let success = rt.block_on(async {
            crate::websocket::rooms::join_room(&connection_uuid, &room_id).await
        });
        return Ok(cx.boolean(success));
    }
    
    Ok(cx.boolean(false))
}

// Функция для выхода из комнаты
pub fn leave_room(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let connection_id = cx.argument::<JsString>(0)?.value(&mut cx);
    let room_id = cx.argument::<JsString>(1)?.value(&mut cx);
    
    // Parse connection_id to Uuid
    let connection_uuid = match Uuid::parse_str(&connection_id) {
        Ok(uuid) => uuid,
        Err(_) => return Ok(cx.boolean(false)),
    };
    
    // Leave room синхронно
    if let Ok(rt) = tokio::runtime::Runtime::new() {
        let success = rt.block_on(async {
            crate::websocket::rooms::leave_room(&connection_uuid, &room_id).await
        });
        return Ok(cx.boolean(success));
    }
    
    Ok(cx.boolean(false))
}

// Function to get all rooms
pub fn get_all_rooms(mut cx: FunctionContext) -> JsResult<JsArray> {
    // Используем функцию из модуля rooms
    if let Ok(rt) = tokio::runtime::Runtime::new() {
        let rooms = rt.block_on(async {
            crate::websocket::rooms::get_all_rooms().await
        });
        
        let result = cx.empty_array();
        
        for (i, room) in rooms.iter().enumerate() {
            let room_obj = cx.empty_object();
            
            let id_prop = cx.string(room.id.clone());
            let name_prop = cx.string(room.name.clone());
            let connections_count = cx.number(room.connections.len() as f64);
            let created_at = cx.string(room.created_at.to_rfc3339());

            room_obj.set(&mut cx, "id", id_prop)?;
            room_obj.set(&mut cx, "name", name_prop)?;
            room_obj.set(&mut cx, "connectionsCount", connections_count)?;
            room_obj.set(&mut cx, "createdAt", created_at)?;

            result.set(&mut cx, i as u32, room_obj)?;
        }
        
        Ok(result)
    } else {
        Ok(cx.empty_array())
    }
}

// Function to get client info
pub fn get_client_info(mut cx: FunctionContext) -> JsResult<JsObject> {
    let connection_id = cx.argument::<JsString>(0)?.value(&mut cx);

    // Parse connection_id to Uuid
    let connection_uuid = match Uuid::parse_str(&connection_id) {
        Ok(uuid) => uuid,
        Err(_) => return Ok(cx.empty_object()),
    };

    // Используем функцию из модуля rooms
    if let Ok(rt) = tokio::runtime::Runtime::new() {
        let conn = rt.block_on(async {
            crate::websocket::connections::get_connection_info(&connection_uuid).await
        });
        
        let result = cx.empty_object();
        
        if let Some(conn) = conn {
            let id_prop = cx.string(conn.id.to_string());
            let client_id_prop = cx.string(conn.client_id.clone());
            let path_prop = cx.string(conn.path.clone());
            let handler_id_prop = cx.string(conn.handler_id.clone());
            let created_at = cx.string(conn.created_at.to_rfc3339());
            let last_ping = cx.string(conn.last_ping.to_rfc3339());

            result.set(&mut cx, "id", id_prop)?;
            result.set(&mut cx, "clientId", client_id_prop)?;
            result.set(&mut cx, "path", path_prop)?;
            result.set(&mut cx, "handlerId", handler_id_prop)?;
            result.set(&mut cx, "createdAt", created_at)?;
            result.set(&mut cx, "lastPing", last_ping)?;

            if let Some(room_id) = &conn.room_id {
                let room_id_prop = cx.string(room_id.clone());
                result.set(&mut cx, "roomId", room_id_prop)?;
            }
        }
        
        Ok(result)
    } else {
        Ok(cx.empty_object())
    }
}

// Function to get user rooms
pub fn get_user_rooms(mut cx: FunctionContext) -> JsResult<JsArray> {
    let connection_id = cx.argument::<JsString>(0)?.value(&mut cx);

    // Parse connection_id to Uuid
    let connection_uuid = match Uuid::parse_str(&connection_id) {
        Ok(uuid) => uuid,
        Err(_) => return Ok(cx.empty_array()),
    };

    // Используем функцию из модуля rooms
    if let Ok(rt) = tokio::runtime::Runtime::new() {
        let room_ids = rt.block_on(async {
            crate::websocket::rooms::get_user_rooms(&connection_uuid).await
        });
        
        let result = cx.empty_array();
        
        for (i, room_id) in room_ids.iter().enumerate() {
            let room_obj = cx.empty_object();
            
            let id_prop = cx.string(room_id.clone());
            let name_prop = cx.string("Unknown".to_string()); // TODO: получить имя комнаты
            let connections_count = cx.number(0.0); // TODO: получить количество соединений
            let created_at = cx.string("Unknown".to_string()); // TODO: получить время создания

            room_obj.set(&mut cx, "id", id_prop)?;
            room_obj.set(&mut cx, "name", name_prop)?;
            room_obj.set(&mut cx, "connectionsCount", connections_count)?;
            room_obj.set(&mut cx, "createdAt", created_at)?;

            result.set(&mut cx, i as u32, room_obj)?;
        }
        
        Ok(result)
    } else {
        Ok(cx.empty_array())
    }
}
