use axum::{
    extract::ws::WebSocketUpgrade,
    extract::FromRequest,
    response::IntoResponse,
    http::Request,
    body::Body,
};
use log;

pub async fn websocket_upgrade_handler(
    req: Request<Body>,
    path: String,
    handler_id: String,
) -> axum::response::Response<axum::body::Body> {
    // Check WebSocket upgrade headers
    if let Some(upgrade) = req.headers().get("upgrade") {
        if upgrade.to_str().unwrap_or("").to_lowercase() == "websocket" {
            log::info!("🔌 WebSocket upgrade request for path: {}", path);
            
            // Extract clientId from query parameters
            let client_id = if let Some(uri) = req.uri().query() {
                // Parse query parameters
                let query_params: std::collections::HashMap<String, String> = uri
                    .split('&')
                    .filter_map(|pair| {
                        let mut parts = pair.splitn(2, '=');
                        if let (Some(key), Some(value)) = (parts.next(), parts.next()) {
                            Some((key.to_string(), value.to_string()))
                        } else {
                            None
                        }
                    })
                    .collect();
                
                query_params.get("clientId").cloned()
            } else {
                None
            };
            
            log::debug!("🔍 Client ID from query params: {:?}", client_id);
            
            // Perform WebSocket upgrade
            match WebSocketUpgrade::from_request(req, &mut ()).await {
                Ok(upgrade) => {
                    log::info!("✅ WebSocket upgrade successful for path: {}", path);
                    
                    // Return response with on_upgrade
                    return upgrade.on_upgrade(|socket| async move {
                        let path = path.clone();
                        let handler_id = handler_id.clone();
                        let client_id = client_id.clone();
                        
                        log::info!("🔌 WebSocket connection established for path: {}", path);
                        // Handle WebSocket connection
                        if let Err(e) = crate::websocket::router::handle_websocket(socket, path, handler_id, client_id).await.map_err(|e| format!("WebSocket error: {}", e)) {
                            log::error!("WebSocket handler error: {}", e);
                        }
                    }).into_response();
                }
                Err(e) => {
                    log::error!("❌ WebSocket upgrade failed for path {}: {}", path, e);
                    return (axum::http::StatusCode::BAD_REQUEST, "WebSocket upgrade failed").into_response();
                }
            }
        }
    }

    // If this is not a WebSocket upgrade, return error
    log::warn!("❌ WebSocket upgrade required for path: {}", path);
    (axum::http::StatusCode::BAD_REQUEST, "WebSocket upgrade required").into_response()
}
