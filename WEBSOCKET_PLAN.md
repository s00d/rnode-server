# WebSocket Server для RNode Server 🌐

## Обзор

WebSocket сервер для RNode Server уже реализован и интегрирован в существующую архитектуру. Система поддерживает real-time приложения с использованием Axum WebSocket, систему комнат, ping/pong механизм и готовый клиентский пакет.

## Реализованные возможности

- ✅ WebSocket сервер на уровне Rust backend с Axum
- ✅ Система комнат для групповой коммуникации
- ✅ Ping/pong для автоматического переподключения
- ✅ Клиентский пакет в папке packages
- ✅ Полная интеграция с существующей архитектурой биндингов
- ✅ Поддержка бинарных сообщений
- ✅ Система метаданных соединений
- ✅ Автоматическое управление соединениями

## Архитектура

### Реализованная архитектура WebSocket
```
Client → Rust Backend (Axum + WebSocket) → Channel → Node.js (Neon FFI) → JavaScript Handlers
                    ↓
              WebSocket Manager (Rust)
                    ↓
              Room System (Rust)
                    ↓
              Connection Manager (Rust)
```

### Реализованная система комнат
```
WebSocket Manager
       ↓
   Room Registry (HashMap<String, Room>)
       ↓
┌─────────────┐
│ Public      │
│ Rooms       │
│ (Open)      │
└─────────────┘
       ↓
   Connection Pool (HashMap<Uuid, WebSocketConnection>)
       ↓
   Event Dispatcher (Neon Channel)
```

## Техническая реализация

### 1. Rust Backend (Реализовано)

#### Структуры данных
```rust
// crates/rnode-server/src/websocket/mod.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketConnection {
    pub id: Uuid,
    pub client_id: String,
    pub path: String,
    pub room_id: Option<String>,
    pub handler_id: String,
    pub metadata: HashMap<String, String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_ping: chrono::DateTime<chrono::Utc>,
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
```

#### FFI функции
```rust
// crates/rnode-server/src/websocket/mod.rs
pub fn register_websocket(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let path = cx.argument::<JsString>(0)?.value(&mut cx);
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
    
    let handler = WebSocketHandler { enabled_events };
    let routes = get_websocket_routes();
    let mut routes_map = routes.blocking_write();
    routes_map.insert(path.clone(), handler);
    
    Ok(cx.undefined())
}
```

### 2. JavaScript API (Реализовано)

#### WebSocket утилиты
```typescript
// src/utils/websocket-utils.ts
export async function executeWebSocketEvent(eventJson: string, timeout: number): Promise<string> {
  const eventData = JSON.parse(eventJson);
  const eventType = eventData.type;
  const path = eventData.path;
  
  const callbacks = websocketCallbacks.get(path);
  if (!callbacks) {
    return JSON.stringify({ shouldContinue: true, shouldCancel: false });
  }

  let result: WebSocketEventResult = {
    shouldContinue: true,
    shouldCancel: false,
    modifiedEvent: eventData
  };

  switch (eventType) {
    case 'connect':
      if (callbacks.onConnect) {
        const callbackResult = callbacks.onConnect(eventData);
        processCallbackResult(callbackResult, result);
      }
      break;
    case 'message':
      if (callbacks.onMessage) {
        const callbackResult = callbacks.onMessage(eventData);
        processCallbackResult(callbackResult, result);
      }
      break;
    // ... другие события
  }

  return JSON.stringify(result);
}
```
```rust
// crates/rnode-server/src/websocket/mod.rs
use std::collections::HashMap;
use std::sync::{Arc, OnceLock};
use tokio::sync::RwLock;
use uuid::Uuid;
use serde::{Serialize, Deserialize};
use axum::extract::ws::{WebSocket, WebSocketUpgrade, Message};
use futures_util::{sink::SinkExt, stream::StreamExt};
use log;

// Импортируем функции для работы с глобальными хранилищами
use crate::websocket::get_websocket_connections;
use crate::websocket::get_websocket_rooms;

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

#[derive(Debug, Clone)]
pub struct WebSocketHandler {
    pub on_connect: Option<String>,
    pub on_message: Option<String>,
    pub on_close: Option<String>,
    pub on_error: Option<String>,
    pub on_join_room: Option<String>,
    pub on_leave_room: Option<String>,
    pub client_id: Option<String>,  // ID клиента для идентификации
}

#[derive(Debug)]
pub struct WebSocketManager {
    connections: Arc<RwLock<HashMap<Uuid, WebSocketConnection>>>,
    rooms: Arc<RwLock<HashMap<String, Room>>>,
    handlers: Arc<RwLock<HashMap<String, WebSocketHandler>>>,
    event_queue: Arc<RwLock<Option<neon::event::Channel>>>,
    ping_interval: tokio::time::Duration,
}

// Глобальные хранилища
pub static WEBSOCKET_ROUTES: OnceLock<RwLock<HashMap<String, WebSocketHandler>>> = OnceLock::new();
pub static WEBSOCKET_CONNECTIONS: OnceLock<RwLock<HashMap<Uuid, WebSocketConnection>>> = OnceLock::new();
pub static WEBSOCKET_ROOMS: OnceLock<RwLock<HashMap<String, Room>>> = OnceLock::new();

pub fn get_websocket_routes() -> &'static RwLock<HashMap<String, WebSocketHandler>> {
    WEBSOCKET_ROUTES.get_or_init(|| RwLock::new(HashMap::new()))
}

pub fn get_websocket_connections() -> &'static RwLock<HashMap<Uuid, WebSocketConnection>> {
    WEBSOCKET_CONNECTIONS.get_or_init(|| RwLock::new(HashMap::new()))
}

pub fn get_websocket_rooms() -> &'static RwLock<HashMap<String, Room>> {
    WEBSOCKET_ROOMS.get_or_init(|| RwLock::new(HashMap::new()))
}
```

#### WebSocket Upgrade и роутинг
```rust
// crates/rnode-server/src/websocket/upgrade.rs
use axum::{
    extract::ws::{WebSocketUpgrade, WebSocket},
    response::IntoResponse,
    http::Request,
    body::Body,
};

pub async fn websocket_upgrade_handler(
    req: Request<Body>,
    path: String,
    handler_id: String,
) -> impl IntoResponse {
    // Проверяем заголовки WebSocket upgrade
    if let Some(upgrade) = req.headers().get("upgrade") {
        if upgrade.to_str().unwrap_or("").to_lowercase() == "websocket" {
            // Выполняем WebSocket upgrade
            let (response, socket) = WebSocketUpgrade::from_request(req, &mut ()).await.unwrap();
            
            // Запускаем обработку WebSocket соединения
            tokio::spawn(async move {
                handle_websocket(socket, path, handler_id).await;
            });
            
            return response;
        }
    }
    
    // Если это не WebSocket upgrade, возвращаем ошибку
    (axum::http::StatusCode::BAD_REQUEST, "WebSocket upgrade required")
}
```

#### WebSocket роутинг с поддержкой комнат
```rust
// crates/rnode-server/src/websocket/router.rs
use axum::{
    extract::ws::{WebSocketUpgrade, WebSocket, Message},
    response::IntoResponse,
    routing::get,
    Router,
};
use futures_util::{sink::SinkExt, stream::StreamExt};

pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    path: String,
    handler_id: String,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_websocket(socket, path, handler_id))
}

async fn handle_websocket(socket: WebSocket, path: String, handler_id: String) {
    let (mut sender, mut receiver) = socket.split();
    
    // Получаем handler для определения client_id
    let routes = get_websocket_routes();
    let routes_map = routes.read().unwrap();
    let handler = routes_map.get(&path).cloned();
    
    // Создание соединения
    let connection_id = Uuid::new_v4();
    let client_id = handler.and_then(|h| h.client_id).unwrap_or_else(|| {
        format!("client_{}", connection_id.to_string().replace("-", "").chars().take(8).collect::<String>())
    });
    
    let mut connection = WebSocketConnection {
        id: connection_id,
        client_id: client_id.clone(),
        path: path.clone(),
        room_id: None,
        handler_id: handler_id.clone(),
        metadata: HashMap::new(),
        created_at: chrono::Utc::now(),
        last_ping: chrono::Utc::now(),
    };
    
    // Сохраняем соединение
    {
        let connections = get_websocket_connections();
        let mut connections_map = connections.write().unwrap();
        connections_map.insert(connection_id, connection.clone());
    }
    
    // Отправляем событие onConnect
    if let Err(e) = send_event("websocket:connect", &connection_id, &path, &handler_id, None).await {
        log::error!("Failed to send connect event: {}", e);
    }
    
    // Запускаем ping/pong в фоне
    let ping_sender = sender.clone();
    let ping_connection_id = connection_id;
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
        loop {
            interval.tick().await;
            
            // Отправляем ping
            if let Err(_) = ping_sender.send(Message::Ping(vec![])).await {
                break; // Соединение закрыто
            }
            
            // Обновляем last_ping
            if let Some(conn) = get_websocket_connections().write().unwrap().get_mut(&ping_connection_id) {
                conn.last_ping = chrono::Utc::now();
            }
            
            // Отправляем ping событие
            if let Err(e) = send_event("websocket:ping", &ping_connection_id, "ping", "ping", None).await {
                log::error!("Failed to send ping event: {}", e);
            }
        }
    });
    
    // Основной цикл обработки сообщений
    while let Some(msg) = receiver.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                handle_text_message(&connection_id, &path, &handler_id, &text).await;
            }
            Ok(Message::Binary(data)) => {
                // Обрабатываем бинарные сообщения
                if let Err(e) = send_event("websocket:binary_message", &connection_id, &path, &handler_id, Some(&format!("Binary data: {} bytes", data.len()))).await {
                    log::error!("Failed to send binary message event: {}", e);
                }
            }
            Ok(Message::Pong(_)) => {
                // Обновляем last_ping при получении pong
                if let Some(conn) = get_websocket_connections().write().unwrap().get_mut(&connection_id) {
                    conn.last_ping = chrono::Utc::now();
                }
                
                // Отправляем pong событие
                if let Err(e) = send_event("websocket:pong_received", &connection_id, &path, &handler_id, None).await {
                    log::error!("Failed to send pong received event: {}", e);
                }
            }
            Ok(Message::Close(_)) => break,
            Err(_) => break,
            _ => {}
        }
    }
    
    // Отправляем событие onClose
    if let Err(e) = send_event("websocket:close", &connection_id, &path, &handler_id, None).await {
        log::error!("Failed to send close event: {}", e);
    }
    
    // Удаляем соединение из комнаты
    if let Some(room_id) = connection.room_id {
        leave_room(&connection_id, &room_id).await;
    }
    
    // Удаляем соединение
    {
        let connections = get_websocket_connections();
        let mut connections_map = connections.write().unwrap();
        connections_map.remove(&connection_id);
    }
}

async fn handle_text_message(connection_id: &Uuid, path: &str, handler_id: &str, text: &str) {
    // Парсим сообщение
    if let Ok(data) = serde_json::from_str::<serde_json::Value>(text) {
        match data.get("type").and_then(|t| t.as_str()) {
            Some("join_room") => handle_join_room_message(connection_id, &data).await,
            Some("leave_room") => handle_leave_room_message(connection_id, &data).await,
            Some("room_message") => handle_room_message_message(connection_id, &data).await,
            Some("ping") => handle_ping_message(connection_id).await,
            _ => {
                // Обычное сообщение
                if let Err(e) = send_event("websocket:message", connection_id, path, handler_id, Some(text)).await {
                    log::error!("Failed to send message event: {}", e);
                }
            }
        }
    }
}





async fn handle_join_room_message(connection_id: &Uuid, data: &serde_json::Value) {
    let room_id = data.get("room_id").and_then(|r| r.as_str());
    
    if let Some(room_id) = room_id {
        if join_room(connection_id, room_id).await {
            if let Err(e) = send_event("websocket:room_joined", connection_id, "room", "join", Some(room_id)).await {
                log::error!("Failed to send room joined event: {}", e);
            }
        } else {
            if let Err(e) = send_event("websocket:room_join_error", connection_id, "room", "join", Some("Failed to join room")).await {
                log::error!("Failed to send room join error event: {}", e);
            }
        }
    }
}

async fn handle_leave_room_message(connection_id: &Uuid, data: &serde_json::Value) {
    let room_id = data.get("room_id").and_then(|r| r.as_str());
    
    if let Some(room_id) = room_id {
        if leave_room(connection_id, room_id).await {
            if let Err(e) = send_event("websocket:room_left", connection_id, "room", "leave", Some(room_id)).await {
                log::error!("Failed to send room left event: {}", e);
            }
        }
    }
}

async fn handle_room_message_message(connection_id: &Uuid, data: &serde_json::Value) {
    let room_id = data.get("room_id").and_then(|r| r.as_str());
    let message = data.get("message").and_then(|m| m.as_str());
    
    if let (Some(room_id), Some(message)) = (room_id, message) {
        // Отправляем сообщение всем в комнате
        if let Err(e) = broadcast_to_room(room_id, &serde_json::json!({
            "type": "room_message",
            "room_id": room_id,
            "message": message,
            "from_client_id": get_websocket_connections().read().unwrap().get(connection_id).map(|conn| conn.client_id.clone()).unwrap_or_default()
        })).await {
            log::error!("Failed to broadcast room message: {}", e);
        }
    }
}

async fn handle_ping_message(connection_id: &Uuid) {
    // Обновляем last_ping
    if let Some(conn) = get_websocket_connections().write().unwrap().get_mut(connection_id) {
        conn.last_ping = chrono::Utc::now();
    }
    
    // Отправляем pong обратно
    if let Err(e) = send_event("websocket:pong", connection_id, "ping", "pong", None).await {
        log::error!("Failed to send pong event: {}", e);
    }
}

// Функции для работы с комнатами
async fn join_room(connection_id: &Uuid, room_id: &str) -> bool {
    let mut rooms = get_websocket_rooms().write().unwrap();
    let mut connections = get_websocket_connections().write().unwrap();
    
    if let Some(room) = rooms.get_mut(room_id) {
        if let Some(conn) = connections.get_mut(connection_id) {
            // Добавляем в комнату
            if !room.connections.contains(connection_id) {
                room.connections.push(*connection_id);
                conn.room_id = Some(room_id.to_string());
                return true;
            }
        }
    }
    
    false
}

async fn leave_room(connection_id: &Uuid, room_id: &str) -> bool {
    let mut rooms = get_websocket_rooms().write().unwrap();
    let mut connections = get_websocket_connections().write().unwrap();
    
    if let Some(room) = rooms.get_mut(room_id) {
        room.connections.retain(|&id| id != *connection_id);
    }
    
    if let Some(conn) = connections.get_mut(connection_id) {
        conn.room_id = None;
    }
    
    true
}

async fn broadcast_to_room(room_id: &str, message: &serde_json::Value) -> Result<(), Box<dyn std::error::Error>> {
    let rooms = get_websocket_rooms().read().unwrap();
    let connections = get_websocket_connections().read().unwrap();
    
    if let Some(room) = rooms.get(room_id) {
        for connection_id in &room.connections {
            if let Some(conn) = connections.get(connection_id) {
                // Отправляем сообщение через Channel с clientId
                let message_with_client = serde_json::json!({
                    "message": message,
                    "from_client_id": conn.client_id,
                    "room_id": room_id
                });
                if let Err(e) = send_event("websocket:room_broadcast", connection_id, "broadcast", "room", Some(message_with_client.to_string())).await {
                    log::error!("Failed to send room broadcast event: {}", e);
                }
            }
        }
    }
    
    Ok(())
}

// Вспомогательные функции
async fn send_event(event_type: &str, connection_id: &Uuid, path: &str, handler_id: &str, data: Option<&str>) -> Result<(), Box<dyn std::error::Error>> {
    // Получаем EVENT_QUEUE из глобального состояния
    if let Some(channel) = crate::utils::get_event_queue().read().unwrap().as_ref() {
        let event_data = serde_json::json!({
            "type": event_type,
            "connection_id": connection_id.to_string(),
            "path": path,
            "handler_id": handler_id,
            "data": data
        });
        
        channel.send(event_data).map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        Ok(())
    } else {
        Err("EVENT_QUEUE not initialized".into())
    }
}


```

### 3. Клиентский пакет (Реализовано)

#### Клиентский пакет `@rnode/websocket-client`

```typescript
// Установка
npm install @rnode/websocket-client

// Использование
import { createWebSocketClient, WebSocketEvent } from '@rnode/websocket-client';

const client = createWebSocketClient({
  url: 'ws://localhost:3000/chat',
  clientId: 'user123',
  autoReconnect: true,
  onConnect: (event: WebSocketEvent) => {
    console.log('Подключен к серверу!');
  },
  onMessage: (event: WebSocketEvent) => {
    console.log('Получено сообщение:', event.data);
  }
});

await client.connect();
client.joinRoom('general');
client.send('Сообщение в комнату', 'general');
```

**Основные возможности:**
- 🔌 Автоматическое переподключение с экспоненциальной задержкой
- 🏠 Система комнат с поддержкой join/leave
- 🏓 Ping/Pong механизм для проверки соединения
- 📱 Полный набор событий (connect, disconnect, message, error, joinRoom, leaveRoom)
- 🎯 Мультиформат: ES modules, UMD, IIFE
- 📝 TypeScript с полной типизацией

#### WebSocket Event Handler
```typescript
// src/utils/websocket-event-handler.ts
import { EventEmitter } from 'events';
import { handlers } from './global-utils';

export class WebSocketEventHandler extends EventEmitter {
  private static instance: WebSocketEventHandler;
  
  static getInstance(): WebSocketEventHandler {
    if (!WebSocketEventHandler.instance) {
      WebSocketEventHandler.instance = new WebSocketEventHandler();
    }
    return WebSocketEventHandler.instance;
  }
  
  /**
   * Обрабатывает события от Rust backend через EVENT_QUEUE
   */
  handleEvent(event: any): void {
    try {
      switch (event.type) {
        case 'websocket:connect':
          this.handleConnect(event);
          break;
        case 'websocket:message':
          this.handleMessage(event);
          break;
        case 'websocket:close':
          this.handleClose(event);
          break;
        case 'websocket:error':
          this.handleError(event);
          break;
        case 'websocket:auth_success':
          this.handleAuthSuccess(event);
          break;
        case 'websocket:auth_error':
          this.handleAuthError(event);
          break;
        case 'websocket:room_joined':
          this.handleRoomJoined(event);
          break;
        case 'websocket:room_left':
          this.handleRoomLeft(event);
          break;
        case 'websocket:room_message':
          this.handleRoomMessage(event);
          break;
        case 'websocket:room_broadcast':
          this.handleRoomBroadcast(event);
          break;
        default:
          this.emit('unknown_event', event);
      }
    } catch (error) {
      console.error('WebSocket event handler error:', error);
      this.emit('error', error);
    }
  }
  
  private handleConnect(event: any): void {
    const { connection_id, path, handler_id } = event;
    
    if (handler_id && handlers.has(handler_id)) {
      const handler = handlers.get(handler_id);
      const socket = this.createSocketObject(connection_id, path);
      
      try {
        handler(socket);
      } catch (error) {
        console.error('WebSocket connect handler error:', error);
        this.emit('error', error);
      }
    }
  }
  
  private handleMessage(event: any): void {
    const { connection_id, path, handler_id, message } = event;
    
    if (handler_id && handlers.has(handler_id)) {
      const handler = handlers.get(handler_id);
      const socket = this.createSocketObject(connection_id, path);
      
      try {
        handler(socket, message);
      } catch (error) {
        console.error('WebSocket message handler error:', error);
        this.emit('error', error);
      }
    }
  }
  
  private handleClose(event: any): void {
    const { connection_id, path, handler_id } = event;
    
    if (handler_id && handlers.has(handler_id)) {
      const handler = handlers.get(handler_id);
      const socket = this.createSocketObject(connection_id, path);
      
      try {
        handler(socket);
      } catch (error) {
        console.error('WebSocket close handler error:', error);
        this.emit('error', error);
      }
    }
  }
  
  private handleError(event: any): void {
    const { connection_id, path, handler_id, error } = event;
    
    if (handler_id && handlers.has(handler_id)) {
      const handler = handlers.get(handler_id);
      const socket = this.createSocketObject(connection_id, path);
      
      try {
        handler(socket, new Error(error));
      } catch (err) {
        console.error('WebSocket error handler error:', err);
        this.emit('error', err);
      }
    }
  }
  
  private handleAuthSuccess(event: any): void {
    const { connection_id, path, handler_id, data } = event;
    
    if (handler_id && handlers.has(handler_id)) {
      const handler = handlers.get(handler_id);
      const socket = this.createSocketObject(connection_id, path);
      
      try {
        handler(socket, data);
      } catch (error) {
        console.error('WebSocket auth success handler error:', error);
        this.emit('error', error);
      }
    }
  }
  
  private handleAuthError(event: any): void {
    const { connection_id, path, handler_id, data } = event;
    
    if (handler_id && handlers.has(handler_id)) {
      const handler = handlers.get(handler_id);
      const socket = this.createSocketObject(connection_id, path);
      
      try {
        handler(socket, new Error(data));
      } catch (error) {
        console.error('WebSocket auth error handler error:', error);
        this.emit('error', error);
      }
    }
  }
  
  private handleRoomJoined(event: any): void {
    const { connection_id, path, handler_id, data } = event;
    
    if (handler_id && handlers.has(handler_id)) {
      const handler = handlers.get(handler_id);
      const socket = this.createSocketObject(connection_id, path);
      
      try {
        handler(socket, data);
      } catch (error) {
        console.error('WebSocket room joined handler error:', error);
        this.emit('error', error);
      }
    }
  }
  
  private handleRoomLeft(event: any): void {
    const { connection_id, path, handler_id, data } = event;
    
    if (handler_id && handlers.has(handler_id)) {
      const handler = handlers.get(handler_id);
      const socket = this.createSocketObject(connection_id, path);
      
      try {
        handler(socket, data);
      } catch (error) {
        console.error('WebSocket room left handler error:', error);
        this.emit('error', error);
      }
    }
  }
  
  private handleRoomMessage(event: any): void {
    const { connection_id, path, handler_id, data } = event;
    
    if (handler_id && handlers.has(handler_id)) {
      const handler = handlers.get(handler_id);
      const socket = this.createSocketObject(connection_id, path);
      
      try {
        const messageData = JSON.parse(data);
        handler(socket, messageData.message, messageData.room_id, messageData.from);
      } catch (error) {
        console.error('WebSocket room message handler error:', error);
        this.emit('error', error);
      }
    }
  }
  
  private handleRoomBroadcast(event: any): void {
    const { connection_id, path, handler_id, data } = event;
    
    if (handler_id && handlers.has(handler_id)) {
      const handler = handlers.get(handler_id);
      const socket = this.createSocketObject(connection_id, path);
      
      try {
        const messageData = JSON.parse(data);
        handler(socket, messageData);
      } catch (error) {
        console.error('WebSocket room broadcast handler error:', error);
        this.emit('error', error);
      }
    }
  }
  
  /**
   * Создает объект WebSocket socket для JavaScript handlers
   */
  private createSocketObject(connectionId: string, path: string): any {
    const addon = require('../load.cjs');
    
    return {
      id: connectionId,
      path,
      send: async (message: string | Buffer) => {
        // Отправка сообщения через Rust backend
        return addon.sendWebSocketMessage(connectionId, message);
      },
      close: async (code?: number, reason?: string) => {
        // Закрытие соединения через Rust backend
        return addon.closeWebSocketConnection(connectionId, code, reason);
      },
      joinRoom: async (roomId: string) => {
        // Присоединение к комнате
        return addon.joinWebSocketRoom(connectionId, roomId);
      },
      leaveRoom: async () => {
        // Выход из комнаты
        return addon.leaveWebSocketRoom(connectionId);
      },
      setMetadata: (key: string, value: string) => {
        // Установка метаданных соединения
        addon.setWebSocketMetadata(connectionId, key, value);
      },
      getMetadata: (key: string) => {
        // Получение метаданных соединения
        return addon.getWebSocketMetadata(connectionId, key);
      }
    };
  }
}

// Инициализация обработчика событий
const websocketEventHandler = WebSocketEventHandler.getInstance();

// Экспортируем для использования в других модулях
export { websocketEventHandler };
```

### 4. JavaScript API через существующие биндинги

#### Расширение существующих биндингов
```rust
// crates/rnode-server/src/lib.rs - добавление WebSocket функций
use neon::prelude::*;

// Функция для регистрации WebSocket роута
pub fn register_websocket(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let path = cx.argument::<JsString>(0)?.value(&mut cx);
    let on_connect = cx.argument::<JsString>(1).ok().map(|s| s.value(&mut cx));
    let on_message = cx.argument::<JsString>(2).ok().map(|s| s.value(&mut cx));
    let on_close = cx.argument::<JsString>(3).ok().map(|s| s.value(&mut cx));
    let on_error = cx.argument::<JsString>(4).ok().map(|s| s.value(&mut cx));
    let on_join_room = cx.argument::<JsString>(5).ok().map(|s| s.value(&mut cx));
    let on_leave_room = cx.argument::<JsString>(6).ok().map(|s| s.value(&mut cx));
    let client_id = cx.argument::<JsString>(7).ok().map(|s| s.value(&mut cx));
    
    let handler = WebSocketHandler {
        on_connect,
        on_message,
        on_close,
        on_error,
        on_join_room,
        on_leave_room,
        client_id,
    };
    
    let routes = get_websocket_routes();
    let mut routes_map = routes.write().unwrap();
    routes_map.insert(path, handler);
    
    Ok(cx.undefined())
}

// Функция для создания комнаты
pub fn create_room(mut cx: FunctionContext) -> JsResult<JsString> {
    let name = cx.argument::<JsString>(0)?.value(&mut cx);
    let description = cx.argument::<JsString>(1).ok().map(|s| s.value(&mut cx));
    let max_connections = cx.argument::<JsNumber>(2).ok().map(|n| n.value(&mut cx) as u32);
    
    let room_id = format!("room_{}", Uuid::new_v4().to_string().replace("-", ""));
    
    let room = Room {
        id: room_id.clone(),
        name,
        description,
        max_connections,
        connections: Vec::new(),
        metadata: HashMap::new(),
        created_at: chrono::Utc::now(),
    };
    
    let rooms = get_websocket_rooms();
    let mut rooms_map = rooms.write().unwrap();
    rooms_map.insert(room_id.clone(), room);
    
    Ok(cx.string(room_id))
}

// Функция для отправки сообщения в комнату
pub fn send_room_message(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let room_id = cx.argument::<JsString>(0)?.value(&mut cx);
    let message = cx.argument::<JsString>(1)?.value(&mut cx);
    
    // Отправляем сообщение в комнату
    tokio::spawn(async move {
        if let Err(e) = broadcast_to_room(&room_id, &serde_json::json!({
            "type": "room_message",
            "room_id": room_id,
            "message": message,
            "timestamp": chrono::Utc::now().to_rfc3339()
        })).await {
            log::error!("Failed to send room message: {}", e);
        }
    });
    
    Ok(cx.boolean(true))
}

// Функция для получения информации о комнате
pub fn get_room_info(mut cx: FunctionContext) -> JsResult<JsObject> {
    let room_id = cx.argument::<JsString>(0)?.value(&mut cx);
    
    let rooms = get_websocket_rooms();
    let rooms_map = rooms.read().unwrap();
    
    let result = cx.empty_object();
    
    if let Some(room) = rooms_map.get(&room_id) {
        let id_prop = cx.string(room.id.clone());
        let name_prop = cx.string(room.name.clone());
        let connections_count = cx.number(room.connections.len() as f64);
        
        result.set(&mut cx, "id", id_prop)?;
        result.set(&mut cx, "name", name_prop)?;
        result.set(&mut cx, "connectionsCount", connections_count)?;
    }
    
    Ok(result)
}

// Регистрация функций в модуле
#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("registerWebSocket", register_websocket)?;
    cx.export_function("createRoom", create_room)?;
    cx.export_function("sendRoomMessage", send_room_message)?;
    cx.export_function("getRoomInfo", get_room_info)?;
    Ok(())
}
```

#### TypeScript интерфейсы
```typescript
// src/types/websocket.d.ts
export interface WebSocketOptions {
  onConnect?: (socket: WebSocketSocket) => void | Promise<void>;
  onMessage?: (socket: WebSocketSocket, message: string) => void | Promise<void>;
  onClose?: (socket: WebSocketSocket) => void | Promise<void>;
  onError?: (socket: WebSocketSocket, error: Error) => void | Promise<void>;
  onJoinRoom?: (socket: WebSocketSocket, roomId: string) => void | Promise<void>;
  onLeaveRoom?: (socket: WebSocketSocket, roomId: string) => void | Promise<void>;
  clientId?: string;  // Опциональный ID клиента для идентификации
}

export interface WebSocketSocket {
  id: string;
  clientId: string;  // ID клиента для идентификации
  path: string;
  roomId?: string;
  
  // Основные методы
  send(message: string | Buffer): Promise<void>;
  close(code?: number, reason?: string): Promise<void>;
  
  // Методы для комнат
  joinRoom(roomId: string): Promise<boolean>;
  leaveRoom(): Promise<boolean>;
  sendToRoom(message: string): Promise<void>;
  
  // Метаданные
  setMetadata(key: string, value: string): void;
  getMetadata(key: string): string | undefined;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  maxConnections?: number;
  connectionsCount: number;
  createdAt: Date;
}

export interface WebSocketManager {
  // Управление комнатами
  createRoom(name: string, options?: RoomOptions): Promise<string>;
  getRoom(roomId: string): Room | undefined;
  getAllRooms(): Room[];
  
  // Управление соединениями
  getConnections(roomId?: string): WebSocketSocket[];
  getConnection(id: string): WebSocketSocket | undefined;
  
  // Broadcast
  broadcast(message: string | Buffer, roomId?: string, filter?: (socket: WebSocketSocket) => boolean): Promise<void>;
  
  // Статистика
  getStats(): {
    totalConnections: number;
    totalRooms: number;
    connectionsByRoom: Record<string, number>;
  };
}

export interface RoomOptions {
  description?: string;
  maxConnections?: number;
}
```

### 3. Клиентский пакет в папке packages

#### Структура пакета
```
packages/
└── rnode-websocket-client/
    ├── package.json
    ├── README.md
    ├── src/
    │   ├── index.ts
    │   ├── client.ts
    │   ├── room.ts
    │   ├── auth.ts
    │   ├── connection.ts
    │   └── types.ts
    ├── examples/
    │   ├── chat.ts
    │   ├── notifications.ts
    │   └── real-time-dashboard.ts
    └── tests/
        ├── client.test.ts
        ├── room.test.ts
        └── auth.test.ts
```

#### package.json для клиентского пакета
```json
{
  "name": "@rnode-server/websocket-client",
  "version": "1.0.0",
  "description": "WebSocket client for RNode Server with room support and authentication",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts"
  },
  "keywords": [
    "websocket",
    "rnode-server",
    "real-time",
    "rooms",
    "authentication"
  ],
  "author": "RNode Server Team",
  "license": "MIT",
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  },
  "peerDependencies": {
    "rnode-server": "^0.6.0"
  }
}
```

#### Основной клиентский класс
```typescript
// packages/rnode-websocket-client/src/client.ts
import { EventEmitter } from 'events';
import { WebSocketClientOptions, ConnectionStatus, WebSocketEvent } from './types';
import { Room } from './room';
import { Auth } from './auth';
import { Connection } from './connection';

export class RNodeWebSocketClient extends EventEmitter {
  private url: string;
  private clientId: string;
  private options: WebSocketClientOptions;
  private connection: Connection;
  private rooms: Map<string, Room> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;

  constructor(url: string, clientId?: string, options: WebSocketClientOptions = {}) {
    super();
    this.url = url;
    this.clientId = clientId || this.generateClientId();
    this.options = {
      autoReconnect: true,
      pingInterval: 30000,
      pongTimeout: 10000,
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      ...options
    };
    
    this.connection = new Connection(url, this.options);
    
    this.setupEventHandlers();
    this.setupPingPong();
  }
  
  /**
   * Генерирует уникальный clientId если не передан пользователем
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Получает текущий clientId
   */
  getClientId(): string {
    return this.clientId;
  }

  async connect(): Promise<void> {
    try {
      await this.connection.connect();
      this.emit('connected');
      this.startPingPong();
    } catch (error) {
      this.emit('error', error);
      if (this.options.autoReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  disconnect(): void {
    this.stopPingPong();
    this.connection.disconnect();
    this.emit('disconnected');
  }



  // Работа с комнатами
  async joinRoom(roomId: string): Promise<Room> {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId)!;
    }

    const room = new Room(roomId, this.connection);
    await room.join();
    
    this.rooms.set(roomId, room);
    this.emit('roomJoined', room);
    
    return room;
  }

  async leaveRoom(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      await room.leave();
      this.rooms.delete(roomId);
      this.emit('roomLeft', roomId);
    }
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  // Отправка сообщений
  async send(message: string | object): Promise<void> {
    if (typeof message === 'object') {
      message = JSON.stringify(message);
    }
    await this.connection.send(message);
  }

  async sendToRoom(roomId: string, message: string | object): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      await room.send(message);
    } else {
      throw new Error(`Room ${roomId} not found`);
    }
  }

  // Статус соединения
  getStatus(): ConnectionStatus {
    return this.connection.getStatus();
  }

  // Приватные методы
  private setupEventHandlers(): void {
    this.connection.on('message', (data) => {
      this.handleMessage(data);
    });

    this.connection.on('close', () => {
      this.emit('disconnected');
      if (this.options.autoReconnect) {
        this.scheduleReconnect();
      }
    });

    this.connection.on('error', (error) => {
      this.emit('error', error);
    });
  }

  private handleMessage(data: any): void {
    try {
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }

      switch (data.type) {
        case 'room_joined':
          this.emit('roomJoined', data.data);
          break;
        case 'room_left':
          this.emit('roomLeft', data.data);
          break;
        case 'room_message':
          this.emit('roomMessage', data.room_id, data.message, data.from);
          break;
        case 'pong':
          this.handlePong();
          break;
        default:
          this.emit('message', data);
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  private setupPingPong(): void {
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, this.options.pingInterval);

    this.pongTimeout = setTimeout(() => {
      this.handlePongTimeout();
    }, this.options.pongTimeout);
  }

  private startPingPong(): void {
    this.setupPingPong();
  }

  private stopPingPong(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  private async sendPing(): Promise<void> {
    try {
      await this.send({ type: 'ping', timestamp: Date.now() });
    } catch (error) {
      this.emit('error', error);
    }
  }

  private handlePong(): void {
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  private handlePongTimeout(): void {
    this.emit('error', new Error('Pong timeout - connection may be lost'));
    this.connection.disconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      this.emit('maxReconnectAttemptsReached');
    }
  }
}

/**
 * Система автореконнекта для WebSocket клиента
 * 
 * Особенности:
 * - Экспоненциальная задержка между попытками (1s, 2s, 4s, 8s, 16s)
 * - Максимальное количество попыток настраивается
 * - Автоматический ping/pong для проверки соединения
 * - Graceful degradation при недоступности сервера
 * 
 * Пример использования:
 * ```typescript
 * const client = new RNodeWebSocketClient('ws://localhost:3000/ws', 'user_123', {
 *   autoReconnect: true,
 *   maxReconnectAttempts: 10,
 *   reconnectDelay: 1000,
 *   pingInterval: 30000,
 *   pongTimeout: 10000
 * });
 * 
 * client.on('connected', () => console.log(`Connected with clientId: ${client.getClientId()}`));
 * client.on('disconnected', () => console.log(`Disconnected clientId: ${client.getClientId()}`));
 * client.on('maxReconnectAttemptsReached', () => console.log('Max attempts reached'));
 * ```
 */
```

#### Класс для работы с комнатами
```typescript
// packages/rnode-websocket-client/src/room.ts
import { EventEmitter } from 'events';
import { Connection } from './connection';
import { RoomMessage, RoomOptions } from './types';

export class Room extends EventEmitter {
  private id: string;
  private connection: Connection;
  private isJoined: boolean = false;
  private messageHistory: RoomMessage[] = [];
  private maxHistorySize: number = 100;

  constructor(id: string, connection: Connection) {
    super();
    this.id = id;
    this.connection = connection;
  }

  async join(): Promise<void> {
    if (this.isJoined) {
      return;
    }

    await this.connection.send({
      type: 'join_room',
      room_id: this.id
    });

    this.isJoined = true;
    this.emit('joined');
  }

  async leave(): Promise<void> {
    if (!this.isJoined) {
      return;
    }

    await this.connection.send({
      type: 'leave_room',
      room_id: this.id
    });

    this.isJoined = false;
    this.emit('left');
  }

  async send(message: string | object): Promise<void> {
    if (!this.isJoined) {
      throw new Error('Cannot send message: not joined to room');
    }

    const roomMessage: RoomMessage = {
      type: 'room_message',
      room_id: this.id,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      timestamp: new Date().toISOString()
    };

    await this.connection.send(roomMessage);
    
    // Добавляем в историю
    this.addToHistory(roomMessage);
  }

  getId(): string {
    return this.id;
  }

  isJoinedToRoom(): boolean {
    return this.isJoined;
  }

  getMessageHistory(): RoomMessage[] {
    return [...this.messageHistory];
  }

  clearMessageHistory(): void {
    this.messageHistory = [];
  }

  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    this.trimHistory();
  }

  private addToHistory(message: RoomMessage): void {
    this.messageHistory.push(message);
    this.trimHistory();
  }

  private trimHistory(): void {
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }
  }
}
```

#### Примеры использования клиента
```typescript
// packages/rnode-websocket-client/examples/chat.ts
import { RNodeWebSocketClient } from '../src';

async function chatExample() {
  // Создаем клиент с указанным clientId
  const client = new RNodeWebSocketClient('ws://localhost:3000/ws', 'chat_user_123', {
    autoReconnect: true,
    pingInterval: 30000
  });

  // Подключение
  client.on('connected', () => {
    console.log('Connected to WebSocket server');
  });

  // Подключение
  client.on('connected', () => {
    console.log(`Connected to WebSocket server with clientId: ${client.getClientId()}`);
    
    // Присоединяемся к чату
    client.joinRoom('general-chat');
  });

  // Присоединение к комнате
  client.on('roomJoined', (roomId) => {
    console.log(`Client ${client.getClientId()} joined room: ${roomId}`);
  });

  // Сообщения в комнате
  client.on('roomMessage', (roomId, message, fromClientId) => {
    console.log(`[${roomId}] ${fromClientId}: ${message}`);
  });

  // Подключаемся
  await client.connect();
  
  // Отправляем сообщение в комнату
  await client.sendToRoom('general-chat', 'Hello, everyone!');
}

chatExample().catch(console.error);
```







#### Примеры использования
```typescript
// Сервер
const app = new RNodeApp();

app.websocket('/ws', {
  onConnect: (socket) => {
    console.log(`Client connected: ${socket.clientId}`);
  },
  onMessage: (socket, message) => {
    console.log(`Message from ${socket.clientId}: ${message}`);
  },
  onJoinRoom: (socket, roomId) => {
    console.log(`Client ${socket.clientId} joined room: ${roomId}`);
  }
});

// Клиент
import { createWebSocketClient } from '@rnode/websocket-client';

const client = createWebSocketClient({
  url: 'ws://localhost:3000/ws',
  clientId: 'user_123',
  autoReconnect: true,
  onConnect: () => {
    console.log('Connected to WebSocket server');
    client.joinRoom('general-chat');
  },
  onJoinRoom: (roomId) => {
    console.log(`Joined room: ${roomId}`);
    client.send('Hello, everyone!', 'general-chat');
  },
  onMessage: (event) => {
    console.log(`[${event.roomId}] ${event.fromClientId}: ${event.data}`);
  }
});

await client.connect();
```

## Реализованные компоненты

### ✅ Rust Backend
- **WebSocket модули**: `mod.rs`, `router.rs`, `connections.rs`, `rooms.rs`, `upgrade.rs`
- **Структуры данных**: `WebSocketConnection`, `Room`, `WebSocketHandler`
- **FFI функции**: `register_websocket`, `create_room`, `send_room_message`, `get_room_info`
- **Система событий**: Обработка connect, message, close, join_room, leave_room, ping, pong

### ✅ JavaScript API
- **WebSocket утилиты**: `websocket-utils.ts` с обработкой событий
- **Интеграция с RNodeApp**: Методы для работы с WebSocket
- **Система колбеков**: Поддержка асинхронных и синхронных обработчиков
- **Типизация**: TypeScript интерфейсы для WebSocket

### ✅ Клиентский пакет
- **Пакет**: `@rnode/websocket-client` (версия 0.5.0)
- **Основной клиент**: `RNodeWebSocketClient` с автопереподключением
- **Система комнат**: Поддержка join/leave комнат
- **Ping/Pong**: Автоматическая проверка соединения
- **Глобальная доступность**: Поддержка браузерного использования
- **Мультиформат**: ES modules, UMD, IIFE для разных сред
- **TypeScript**: Полная типизация с готовыми типами









## Заключение

WebSocket сервер для RNode Server полностью реализован и готов к использованию. Система обеспечивает:

### Ключевые преимущества
- **Высокая производительность** благодаря Axum WebSocket и Rust backend
- **Гибкость** через систему комнат для различных сценариев
- **Надежность** через автоматическое переподключение и ping/pong
- **Удобство** через готовый клиентский пакет
- **Полная интеграция** с существующей архитектурой RNode Server

### Готовые возможности
- **Real-time чаты** с поддержкой комнат
- **Системы уведомлений** с push-сообщениями
- **Интерактивные дашборды** с live-обновлениями
- **Многопользовательские игры** с синхронизацией
- **Collaborative editing** с одновременным редактированием

RNode Server теперь является полноценной платформой для современных real-time приложений с богатой функциональностью и высокой производительностью.
