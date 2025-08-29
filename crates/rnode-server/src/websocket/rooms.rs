use std::collections::HashMap;
use std::sync::OnceLock;
use tokio::sync::RwLock;
use uuid::Uuid;
use serde_json;
use chrono;
use log;

use crate::websocket::{Room, WebSocketConnection};

// Функция get_connection_info не используется и удалена для чистоты кода

// Глобальные состояния для комнат и соединений
static WEBSOCKET_ROOMS: OnceLock<RwLock<HashMap<String, Room>>> = OnceLock::new();
static WEBSOCKET_CONNECTIONS: OnceLock<RwLock<HashMap<Uuid, WebSocketConnection>>> = OnceLock::new();

// Геттеры для глобальных состояний (создают автоматически при первом обращении)
pub fn get_websocket_rooms() -> &'static RwLock<HashMap<String, Room>> {
    WEBSOCKET_ROOMS.get_or_init(|| RwLock::new(HashMap::new()))
}

pub fn get_websocket_connections() -> &'static RwLock<HashMap<Uuid, WebSocketConnection>> {
    log::debug!("🔍 get_websocket_connections called");
    let result = WEBSOCKET_CONNECTIONS.get_or_init(|| {
        log::debug!("🆕 Initializing WEBSOCKET_CONNECTIONS");
        RwLock::new(HashMap::new())
    });
    log::debug!("✅ get_websocket_connections returned");
    result
}

// Функции для работы с комнатами
pub async fn join_room(connection_id: &Uuid, room_id: &str) -> bool {
    log::debug!("🔍 Attempting to join room {} for connection {}", room_id, connection_id);
    
    let mut rooms = get_websocket_rooms().write().await;
    let mut connections = get_websocket_connections().write().await;
    
    log::debug!("📊 Found {} rooms, {} connections", rooms.len(), connections.len());
    
    if let Some(room) = rooms.get_mut(room_id) {
        log::debug!("✅ Room {} found", room_id);
        if let Some(conn) = connections.get_mut(connection_id) {
            log::debug!("✅ Connection {} found", connection_id);
            // Добавляем в комнату
            if !room.connections.contains(connection_id) {
                room.connections.push(*connection_id);
                conn.room_id = Some(room_id.to_string());
                log::debug!("✅ Successfully joined room {} for connection {}", room_id, connection_id);
                return true;
            } else {
                log::debug!("⚠️ Connection {} already in room {}", connection_id, room_id);
            }
        } else {
            log::error!("❌ Connection {} not found", connection_id);
        }
    } else {
        log::error!("❌ Room {} not found", room_id);
        log::debug!("📋 Available rooms: {:?}", rooms.keys().collect::<Vec<_>>());
    }
    
    false
}

pub async fn leave_room(connection_id: &Uuid, room_id: &str) -> bool {
    let mut rooms = get_websocket_rooms().write().await;
    let mut connections = get_websocket_connections().write().await;
    
    if let Some(room) = rooms.get_mut(room_id) {
        room.connections.retain(|&id| id != *connection_id);
    }
    
    if let Some(conn) = connections.get_mut(connection_id) {
        conn.room_id = None;
    }
    
    true
}

// Создание новой комнаты
pub async fn create_room(room_id: &str, name: &str, _metadata: Option<serde_json::Value>) -> bool {
    let mut rooms = get_websocket_rooms().write().await;
    
    if rooms.contains_key(room_id) {
        log::warn!("⚠️ Room {} already exists", room_id);
        return false;
    }
    
    let room = Room {
        id: room_id.to_string(),
        name: name.to_string(),
        description: None,
        max_connections: None,
        connections: Vec::new(),
        metadata: HashMap::new(),
        created_at: chrono::Utc::now(),
    };
    
    rooms.insert(room_id.to_string(), room);
    log::info!("✅ Room {} created: {}", room_id, name);
    true
}

// Получение информации о комнате
pub async fn get_room_info(room_id: &str) -> Option<Room> {
    let rooms = get_websocket_rooms().read().await;
    rooms.get(room_id).cloned()
}

// Получение всех комнат
pub async fn get_all_rooms() -> Vec<Room> {
    let rooms = get_websocket_rooms().read().await;
    rooms.values().cloned().collect()
}

// Получение комнат пользователя
pub async fn get_user_rooms(connection_id: &Uuid) -> Vec<String> {
    let connections = get_websocket_connections().read().await;
    if let Some(conn) = connections.get(connection_id) {
        if let Some(room_id) = &conn.room_id {
            vec![room_id.clone()]
        } else {
            Vec::new()
        }
    } else {
        Vec::new()
    }
}
