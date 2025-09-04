use axum::{
    extract::ws::{WebSocket, Message},
};
use futures_util::stream::StreamExt;
use uuid::Uuid;
use log;

use crate::websocket::{
    get_websocket_routes
};
use crate::websocket::rooms::{
    join_room,
    leave_room
};
use crate::websocket::connections::{
    add_connection,
    remove_connection,
    add_sender,
    remove_sender,
    send_direct_message,
    broadcast_to_room,
    send_websocket_event,
    create_connection,
    format_welcome_message,
    format_ping_message,
    format_pong_message,
    format_room_joined_message,
    format_room_left_message,
    format_room_message,
    format_message_ack,
    format_error_message,
    update_connection_last_ping,
    get_connection_info,
    get_connection_room
};

// Global storage for WebSocket senders is now in the connections module

// This function is not used and removed for code cleanliness

pub async fn handle_websocket(socket: WebSocket, path: String, handler_id: String, client_id_from_query: Option<String>) -> Result<(), String> {
    let (sender, mut receiver) = socket.split();
    
    log::info!("🔌 WebSocket connection established for path: {}", path);
    
    // Get handler to determine JavaScript functions
    let routes = get_websocket_routes();
    let handler = {
        let routes_map = routes.read().await;
        routes_map.get(&path).cloned()
    };
    
    log::debug!("🔍 Handler found: {:?}", handler.is_some());

    // Create connection
    let connection_id = Uuid::new_v4();
    
    // Use clientId from query parameters if available, otherwise generate automatically
    let client_id = if let Some(query_client_id) = client_id_from_query {
        log::debug!("🆔 Using client ID from query params: {}", query_client_id);
        query_client_id
    } else {
        let generated_client_id = format!("client_{}", connection_id.to_string().replace("-", "").chars().take(8).collect::<String>());
        log::debug!("🆔 Generated client ID: {}", generated_client_id);
        generated_client_id
    };
    
    log::debug!("🆔 Final Client ID: {}", client_id);
    log::debug!("🔗 Connection ID generated: {}", connection_id);

    let connection = create_connection(connection_id, client_id.clone(), path.clone(), handler_id.clone());
    
    log::debug!("🔧 Connection object created");

    // Call WebSocket callbacks BEFORE adding connection and sender
    let connect_result = send_websocket_event("connect", &connection_id, &path, &handler_id, None, Some(&client_id)).await;
            match connect_result {
            Ok(Some(_)) => {
                // Event allowed, continue
                log::debug!("✅ Connect event allowed by callback");
                
                // ONLY NOW save connection to global state
                add_connection(connection_id, connection.clone()).await;
            log::debug!("💾 Connection saved to global state");
            
                            // ONLY NOW save sender to global state
                add_sender(connection_id, tokio::sync::Mutex::new(sender)).await;
            log::debug!("💾 Sender saved to global state");
            
            log::info!("✅ WebSocket connection saved: {} -> {}", client_id, connection_id);
            
                            // Send welcome message
                log::debug!("📤 Preparing welcome message...");
            let welcome_msg = format_welcome_message(&connection_id, &client_id, &path);
            
            log::debug!("📤 Welcome message formatted: {}", welcome_msg);
            
            if let Err(e) = send_direct_message(&connection_id, &welcome_msg).await {
                log::error!("❌ Failed to send welcome message: {}", e);
            } else {
                log::info!("✅ Welcome message sent to client {}: {}", client_id, welcome_msg);
            }
        }
        Ok(None) => {
            // Событие отменено колбеком
            log::info!("🚫 Connect event cancelled by callback");
            return Ok(()); // Завершаем функцию, НЕ добавляем соединение
        }
        Err(e) => {
            log::error!("Failed to call WebSocket connect callback: {}", e);
            // При ошибке колбека событие отменяется автоматически
            return Ok(()); // Завершаем функцию, НЕ добавляем соединение
        }
    }
    
                    // Start ping/pong in background (only server initiates ping)
    let ping_connection_id = connection_id;
    let ping_path = path.clone();
    let ping_handler_id = handler_id.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
        loop {
            interval.tick().await;
            
            // Check if connection is still active
            let connection_info = get_connection_info(&ping_connection_id).await;
            if connection_info.is_none() {
                log::debug!("🔌 Connection {} no longer exists, stopping ping", ping_connection_id);
                break;
            }
            
            // Call WebSocket callbacks BEFORE sending ping
            let ping_result = send_websocket_event("ping", &ping_connection_id, &ping_path, &ping_handler_id, None, None).await;
            match ping_result {
                Ok(Some(_)) => {
                    // Event allowed, continue
                    log::debug!("✅ Ping event allowed by callback");
                    
                    // ONLY NOW send ping
                    if let Err(e) = send_direct_message(&ping_connection_id, &format_ping_message()).await {
                        log::error!("Failed to send ping: {}", e);
                        break; // Connection closed
                    }
                    
                    // ONLY NOW update last_ping
                    update_connection_last_ping(&ping_connection_id).await;
                }
                Ok(None) => {
                    // Event cancelled by callback - DO NOT send ping
                    log::info!("🚫 Ping event cancelled by callback");
                    // Skip this ping, DO NOT send and DO NOT update last_ping
                }
                Err(e) => {
                    log::error!("Failed to send ping event: {}", e);
                    // On callback error, event is automatically cancelled
                    // Skip this ping, DO NOT send and DO NOT update last_ping
                }
            }
        }
    });
    
    // Main message processing loop
    while let Some(msg) = receiver.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                log::debug!("📨 Text message received: {}", text);
                
                // Call WebSocket callbacks BEFORE processing message
                let message_result = send_websocket_event("message", &connection_id, &path, &handler_id, Some(&text), None).await;
                match message_result {
                    Ok(Some(_)) => {
                        // Event allowed, continue processing
                        log::debug!("✅ Message event allowed by callback");
                        handle_text_message(&connection_id, &path, &handler_id, &text).await?;
                    }
                    Ok(None) => {
                        // Event cancelled by callback
                        log::info!("🚫 Message event cancelled by callback");
                        // Do not process message
                    }
                    Err(e) => {
                        log::error!("Failed to call WebSocket message callback: {}", e);
                        // On callback error, event is automatically cancelled
                        // handle_text_message is not called
                        // Do not process message
                    }
                }
            }
            Ok(Message::Binary(data)) => {
                log::debug!("📦 Binary message received: {} bytes", data.len());
                
                // Record binary message received metric
                let room_id = get_connection_room(&connection_id).await;
                crate::metrics::websocket::record_message_received("binary", room_id.as_deref(), &path, data.len());
                
                // Call WebSocket callbacks BEFORE processing binary message
                let binary_result = send_websocket_event("binary_message", &connection_id, &path, &handler_id, Some(&format!("Binary data: {} bytes", data.len())), None).await;
                match binary_result {
                    Ok(Some(_)) => {
                        // Event allowed, can add additional processing
                        log::debug!("✅ Binary message event allowed by callback");
                    }
                    Ok(None) => {
                        // Event cancelled by callback
                        log::info!("🚫 Binary message event cancelled by callback");
                        // Do not process binary message
                    }
                    Err(e) => {
                        log::error!("Failed to call WebSocket binary message callback: {}", e);
                        // On callback error, event is automatically cancelled
                        crate::metrics::websocket::record_error("binary_message_callback_failed", &path, room_id.as_deref());
                        // Do not process binary message
                    }
                }
            }
            Ok(Message::Pong(_)) => {
                log::debug!("🏓 Pong received from client");
                // Update last_ping when receiving pong
                update_connection_last_ping(&connection_id).await;
            }
            Ok(Message::Close(_)) => {
                log::info!("🔌 WebSocket close message received");
                break;
            }
            Err(e) => {
                log::error!("❌ WebSocket error: {}", e);
                let room_id = get_connection_room(&connection_id).await;
                crate::metrics::websocket::record_error("websocket_error", &path, room_id.as_deref());
                break;
            }
            _ => {}
        }
    }
    
    log::info!("🔌 WebSocket connection closing for path: {}", path);
    
    // Call WebSocket callbacks BEFORE closing connection
    let close_result = send_websocket_event("close", &connection_id, &path, &handler_id, None, None).await;
    match close_result {
        Ok(Some(_)) => {
            // Событие разрешено, продолжаем закрытие
            log::debug!("✅ Close event allowed by callback");
        }
        Ok(None) => {
            // Событие отменено колбеком
            log::info!("🚫 Close event cancelled by callback");
            // Можно попытаться восстановить соединение или выполнить другие действия
            return Ok(()); // Завершаем функцию, не закрываем соединение
        }
        Err(e) => {
            log::error!("Failed to call WebSocket close callback: {}", e);
            // При ошибке колбека событие отменяется автоматически
            return Ok(()); // Завершаем функцию, не закрываем соединение
        }
    }
    
    // ТОЛЬКО СЕЙЧАС удаляем соединение из комнаты
    if let Some(room_id) = get_connection_room(&connection_id).await {
        leave_room(&connection_id, &room_id).await;
    }
    
    // ТОЛЬКО СЕЙЧАС удаляем соединение и отправителя
    remove_connection(&connection_id).await;
    remove_sender(&connection_id).await;
    
    log::info!("✅ WebSocket connection cleaned up for path: {}", path);
    Ok(())
}

async fn handle_text_message(connection_id: &Uuid, path: &str, _handler_id: &str, text: &str) -> Result<(), String> {
    // Record message received metric
    let room_id = crate::websocket::connections::get_connection_room(connection_id).await;
    crate::metrics::websocket::record_message_received("text", room_id.as_deref(), path, text.len());
    
    // Парсим сообщение
    if let Ok(data) = serde_json::from_str::<serde_json::Value>(text) {
        match data.get("type").and_then(|t| t.as_str()) {
            Some("join_room") => {
                if let Err(e) = handle_join_room_message(connection_id, &data).await {
                    log::error!("Join room error: {}", e);
                    crate::metrics::websocket::record_error("join_room_failed", path, room_id.as_deref());
                }
            },
            Some("leave_room") => {
                if let Err(e) = handle_leave_room_message(connection_id, &data).await {
                    log::error!("Leave room error: {}", e);
                    crate::metrics::websocket::record_error("leave_room_failed", path, room_id.as_deref());
                }
            },
            Some("room_message") => {
                if let Err(e) = handle_room_message_message(connection_id, &data).await {
                    log::error!("Room message error: {}", e);
                    crate::metrics::websocket::record_error("room_message_failed", path, room_id.as_deref());
                }
            },
            Some("direct_message") => {
                if let Err(e) = handle_direct_message_message(connection_id, &data).await {
                    log::error!("Direct message error: {}", e);
                    crate::metrics::websocket::record_error("direct_message_failed", path, room_id.as_deref());
                }
            },
            Some("ping") => {
                if let Err(e) = handle_ping_message(connection_id).await {
                    log::error!("Ping error: {}", e);
                    crate::metrics::websocket::record_error("ping_failed", path, room_id.as_deref());
                }
            },
            _ => {
                // Обычное сообщение - отправляем обратно клиенту для подтверждения
                let message_ack = format_message_ack(text);
                
                if let Err(e) = send_direct_message(connection_id, &message_ack).await {
                    log::error!("Failed to send message ack: {}", e);
                    crate::metrics::websocket::record_error("message_ack_failed", path, room_id.as_deref());
                }
            }
        }
    } else {
        // JSON parsing error
        crate::metrics::websocket::record_error("json_parse_failed", path, room_id.as_deref());
    }
    Ok(())
}

async fn handle_join_room_message(connection_id: &Uuid, data: &serde_json::Value) -> Result<(), String> {
    log::debug!("🔍 Processing join room message: {}", data);
    
    // Extract room_id
    let room_id = data.get("room_id").and_then(|r| r.as_str());
    
    log::debug!("🔍 Extracted room_id: {:?}", room_id);
    
    if let Some(room_id) = room_id {
        // Call WebSocket callbacks BEFORE joining room
        let join_result = send_websocket_event("join_room", connection_id, "room", "join", Some(room_id), None).await;
        match join_result {
            Ok(Some(_)) => {
                // Event allowed, continue joining room
                log::debug!("✅ Join room event allowed by callback");
                
                if join_room(connection_id, room_id).await {
                    // Send room join confirmation
                    let join_success = format_room_joined_message(room_id);
                    
                    if let Err(e) = send_direct_message(connection_id, &join_success).await {
                        log::error!("Failed to send room joined message: {}", e);
                    } else {
                        log::info!("✅ Client {} joined room {}", connection_id, room_id);
                    }
                } else {
                    // Send room join error
                    let join_error = format_error_message("room_join_error", "Failed to join room");
                    
                    if let Err(e) = send_direct_message(connection_id, &join_error).await {
                        log::error!("Failed to send room join error message: {}", e);
                    }
                }
            }
                                Ok(None) => {
                // Event cancelled by callback - DO NOT join room
                log::info!("🚫 Join room event cancelled by callback");
                return Ok(()); // End function, do not join room
            }
        Err(e) => {
            log::error!("Failed to call WebSocket joinRoom callback: {}", e);
            // On callback error, event is automatically cancelled
            // join_room is not called
            return Ok(()); // End function, do not join room
        }
        }
    } else {
        // Send room join error
        let join_error = format_error_message("room_join_error", "Failed to join room");
        
        if let Err(e) = send_direct_message(connection_id, &join_error).await {
            log::error!("Failed to send room join error message: {}", e);
        }
    }
    Ok(())
}

async fn handle_direct_message_message(connection_id: &Uuid, data: &serde_json::Value) -> Result<(), String> {
    log::debug!("🔍 Processing direct message: {}", data);
    
    // Extract target_client_id and message
    let target_client_id = data.get("target_client_id").and_then(|t| t.as_str());
    let message = data.get("data").and_then(|m| m.as_str());
    
    log::debug!("🔍 Extracted target_client_id: {:?}, message: {:?}", target_client_id, message);
    
    if let (Some(target_client_id), Some(message)) = (target_client_id, message) {
        // Get sender's client_id
        let from_client_id = get_connection_info(connection_id).await.map(|conn| conn.client_id).unwrap_or_default();
        
        log::debug!("📤 Sending direct message from {} to client {}: {}", from_client_id, target_client_id, message);
        
        // Find connection by client_id
        let connections = crate::websocket::rooms::get_websocket_connections().read().await;
        let target_connection = connections.values().find(|conn| conn.client_id == target_client_id);
        
        if let Some(target_conn) = target_connection {
            // Format message for sending
            let direct_message = serde_json::json!({
                "type": "direct_message",
                "message": message,
                "from_client_id": from_client_id,
                "timestamp": chrono::Utc::now().to_rfc3339()
            });
            
            // Send message to target client
            if let Err(e) = send_direct_message(&target_conn.id, &direct_message).await {
                log::error!("❌ Failed to send direct message to client {}: {}", target_client_id, e);
            } else {
                log::info!("✅ Direct message sent to client {}: {}", target_client_id, message);
            }
        } else {
            log::warn!("⚠️ Target client {} not found", target_client_id);
            
            // Send error to sender
            let error_message = format_error_message("client_not_found", &format!("Client {} not found", target_client_id));
            if let Err(e) = send_direct_message(connection_id, &error_message).await {
                log::error!("Failed to send error message: {}", e);
            }
        }
    } else {
        log::error!("❌ Invalid direct message format: target_client_id={:?}, message={:?}", target_client_id, message);
        
        // Send error to sender
        let error_message = format_error_message("invalid_format", "Invalid direct message format");
        if let Err(e) = send_direct_message(connection_id, &error_message).await {
            log::error!("Failed to send error message: {}", e);
        }
    }
    Ok(())
}

async fn handle_leave_room_message(connection_id: &Uuid, data: &serde_json::Value) -> Result<(), String> {
    log::debug!("🔍 Processing leave room message: {}", data);
    
    // Extract room_id
    let room_id = data.get("room_id").and_then(|r| r.as_str());
    
    log::debug!("🔍 Extracted room_id: {:?}", room_id);
    
    if let Some(room_id) = room_id {
        // Call WebSocket callbacks BEFORE leaving room
        let leave_result = send_websocket_event("leave_room", connection_id, "room", "leave", Some(room_id), None).await;
        match leave_result {
            Ok(Some(_)) => {
                // Event allowed, continue leaving room
                log::debug!("✅ Leave room event allowed by callback");
                
                if leave_room(connection_id, room_id).await {
                    // Send room leave confirmation
                    let leave_success = format_room_left_message(room_id);
                    
                    if let Err(e) = send_direct_message(connection_id, &leave_success).await {
                        log::error!("Failed to send room left message: {}", e);
                    } else {
                        log::info!("✅ Client {} left room {}", connection_id, room_id);
                    }
                }
            }
            Ok(None) => {
                // Event cancelled by callback - DO NOT leave room
                log::info!("🚫 Leave room event cancelled by callback");
                return Ok(()); // End function, do not leave room
            }
            Err(e) => {
                log::error!("Failed to call WebSocket leaveRoom callback: {}", e);
                // On callback error, event is automatically cancelled
                // leave_room is not called
                return Ok(()); // End function, do not leave room
            }
        }
    }
    Ok(())
}

async fn handle_room_message_message(connection_id: &Uuid, data: &serde_json::Value) -> Result<(), String> {
    log::debug!("🔍 Processing room message: {}", data);
    
    // Extract room_id and message
    let room_id = data.get("room_id").and_then(|r| r.as_str());
    
    // Message can be in "message", "data" (if data is string), or in data.message
    let message = data.get("message").and_then(|m| m.as_str())
        .or_else(|| {
            // If data is string, use it as message
            if let Some(data_val) = data.get("data") {
                if data_val.is_string() {
                    data_val.as_str()
                } else {
                    // If data is object, look for message field
                    data_val.get("message").and_then(|m| m.as_str())
                }
            } else {
                None
            }
        });
    
    log::debug!("🔍 Extracted room_id: {:?}, message: {:?}", room_id, message);
    
    if let (Some(room_id), Some(message)) = (room_id, message) {
        // Get sender's client_id
        let from_client_id = get_connection_info(connection_id).await.map(|conn| conn.client_id).unwrap_or_default();
        
        log::debug!("📤 Broadcasting message from {} to room {}: {}", from_client_id, room_id, message);
        
        // Send message to everyone in room
        if let Err(e) = broadcast_to_room(room_id, &format_room_message(room_id, message, &from_client_id)).await {
            log::error!("❌ Failed to broadcast room message: {}", e);
        } else {
            log::info!("✅ Room message broadcasted to room {}: {}", room_id, message);
        }
    } else {
        log::error!("❌ Invalid room message format: room_id={:?}, message={:?}", room_id, message);
    }   
    Ok(())
}

async fn handle_ping_message(connection_id: &Uuid) -> Result<(), String> {
    // Call WebSocket callbacks BEFORE processing ping
    let ping_result = send_websocket_event("ping", connection_id, "ping", "ping", None, None).await;
            match ping_result {
            Ok(Some(_)) => {
                // Event allowed, continue processing
                log::debug!("✅ Ping event allowed by callback");
                
                // Update last_ping
                update_connection_last_ping(connection_id).await;
                
                // Send pong back
                let pong_message = format_pong_message();
            
            if let Err(e) = send_direct_message(connection_id, &pong_message).await {
                log::error!("Failed to send pong message: {}", e);
            }
        }
        Ok(None) => {
            // Event cancelled by callback - DO NOT process ping
            log::info!("🚫 Ping event cancelled by callback");
            return Ok(()); // End function, do not process ping
        }
        Err(e) => {
            log::error!("Failed to call WebSocket ping callback: {}", e);
            // On callback error, event is automatically cancelled
            // update_connection_last_ping and send_direct_message are not called
            return Ok(()); // End function, do not process ping
        }
    }
    Ok(())
}
