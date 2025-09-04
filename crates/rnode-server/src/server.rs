use crate::handlers::dynamic_handler;

use crate::metrics::{init_metrics, render_metrics, http::track_metrics, websocket::update_websocket_metrics, system::update_system_metrics};
use crate::request::Request;
use crate::static_files::fallback::handle_static_fallback;
use crate::file_operations::handlers::{download_handler_impl, upload_handler_impl};
use crate::types::{get_download_routes, get_event_queue, get_routes, get_upload_routes};
use crate::utils::config_extractor;
use crate::websocket;
use axum::{
    Router,
    body::Body,
    extract::Request as AxumRequest,
    middleware::Next,
    routing::{any, delete, get, options, patch, post, put, trace},
};

use neon::prelude::*;

use axum_server::tls_rustls::RustlsConfig;

use log::{debug, error, info, warn};

use std::net::SocketAddr;

// Слой для формирования Request и Response объектов
async fn request_response_layer(
    req: AxumRequest<Body>,
    next: Next,
) -> Result<axum::response::Response, axum::http::StatusCode> {
    // Check if this is a multipart request
    let content_type = req
        .headers()
        .get("content-type")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("")
        .to_string();

    // For multipart requests, do not consume body here
    if content_type.contains("multipart/form-data") {
        // Create Request object from axum Request without parsing body
        let request = Request::from_axum_request(&req);
        
        // Save in extensions for further transmission
        let mut req = req;
        req.extensions_mut().insert(request);
        
        // Pass request further without changing body
        Ok(next.run(req).await)
    } else {
        // For other requests, parse body as usual
        let (parts, body) = req.into_parts();

        // Extract request body
        let body_bytes = axum::body::to_bytes(body, usize::MAX).await.ok();

        // Create new request from parts
        let mut req = AxumRequest::from_parts(parts, Body::empty());

        // Create Request object from axum Request
        let mut request = Request::from_axum_request(&req);

        // Parse request body if it exists
        if let Some(body_bytes) = body_bytes {
            use crate::request_parser::RequestParser;
            let (parsed_body, files) =
                RequestParser::parse_request_body(&body_bytes, &request.content_type).await;
            request.body = parsed_body;
            request.files = files;
        }

        // Save in extensions for further transmission
        req.extensions_mut().insert(request);

        // Pass request further
        Ok(next.run(req).await)
    }
}

// Structure for SSL/TLS configuration
#[derive(Debug)]
pub struct SslConfig {
    pub cert_file: Option<String>,
    pub key_file: Option<String>,
}

impl SslConfig {
    pub fn from_files(cert_path: &str, key_path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        Ok(SslConfig {
            cert_file: Some(cert_path.to_string()),
            key_file: Some(key_path.to_string()),
        })
    }
}

// Function for starting the server
pub fn start_listen(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let (port, host, ssl_config, metrics_enabled, timeout, dev_mode) =
        config_extractor::extract_server_params(&mut cx)?;
    info!(
        "🚀 Starting server on {}:{} {}",
        host.iter()
            .map(|b| b.to_string())
            .collect::<Vec<_>>()
            .join("."),
        port,
        if ssl_config.is_some() {
            "(HTTPS)"
        } else {
            "(HTTP)"
        }
    );

    // Create Channel for communication with JavaScript
    let queue = cx.channel();

    // Save Channel in global variable
    {
        let event_queue_guard = get_event_queue();
        let mut event_queue_map = event_queue_guard.write().unwrap();
        *event_queue_map = Some(queue);
    }

    // Start real HTTP server
    std::thread::spawn(move || {
        // let rt = tokio::runtime::Runtime::new().unwrap();
        let rt = tokio::runtime::Builder::new_multi_thread()
            .worker_threads(num_cpus::get()) // number of threads = number of cores
            .enable_all()
            .build()
            .unwrap();
        rt.block_on(async {
            // Create base router
            let mut app = Router::new();

            // Add dynamic routes
            let routes = get_routes();
            let routes_map = routes.read().unwrap();
            // Create clones for use in closures
            let routes_vec: Vec<(String, String, String)> = routes_map.iter()
                .map(|(_, route_info)| (route_info.path.clone(), route_info.method.clone(), route_info.handler_id.clone()))
                .collect();

            debug!("Routes found: {:?}", routes_vec);
            for (path, method, handler_id) in routes_vec {
                let path_clone = path.clone();
                let method_clone = method.clone();
                let handler_id_clone = handler_id.clone();
                let handler_fn = move |req: axum::extract::Request| {
                        let registered_path = path_clone.clone();
                        let method = method_clone.clone();
                        let handler_id = handler_id_clone.clone();
                        let timeout_clone = timeout;
                        let dev_mode_clone = dev_mode;
                        async move {
                            // Get actual path from request
                            let actual_path = req.uri().path().to_string();
                            dynamic_handler(req, actual_path, registered_path, method, handler_id, timeout_clone, dev_mode_clone).await
                        }
                    };

                match method.as_str() {
                    "GET" => app = app.route(&path, get(handler_fn)),
                    "POST" => app = app.route(&path, post(handler_fn)),
                    "PUT" => app = app.route(&path, put(handler_fn)),
                    "DELETE" => app = app.route(&path, delete(handler_fn)),
                    "PATCH" => app = app.route(&path, patch(handler_fn)),
                    "OPTIONS" => app = app.route(&path, options(handler_fn)),
                    "TRACE" => app = app.route(&path, trace(handler_fn)),
                    "ANY" => app = app.route(&path, any(handler_fn)),
                    _ => {}
                }
            }

            let addr = SocketAddr::from(([127, 0, 0, 1], port));
            warn!("Server listening on http://{}", addr);
            debug!("Registered dynamic routes:");
            for (_, route_info) in routes_map.iter() {
                debug!("  {} {}", route_info.method, route_info.path);
            }

            // Release lock before starting server
            drop(routes_map);

            // Add WebSocket routes
            let websocket_routes = websocket::get_websocket_routes();
            let websocket_routes_map = websocket_routes.read().await;
            let websocket_routes_vec: Vec<(String, websocket::WebSocketHandler)> = websocket_routes_map.iter()
                .map(|(path, handler)| (path.clone(), handler.clone()))
                .collect();

            for (path, _handler) in websocket_routes_vec {
                let path_clone = path.clone();
                
                // Generate unique handler ID for WebSocket
                let handler_id = format!("ws_{}_{}", path.replace('/', "_"), std::process::id());
                
                let websocket_handler = move |req: axum::extract::Request| {
                    let path = path_clone.clone();
                    let handler_id = handler_id.clone();
                    async move {
                        // Use the upgrade handler for WebSocket connections
                        websocket::upgrade::websocket_upgrade_handler(req, path, handler_id).await
                    }
                };

                app = app.route(&path, any(websocket_handler));
                debug!("🔌 WebSocket route registered: {}", path);
            }

            // Release WebSocket routes lock
            drop(websocket_routes_map);

            // Add dynamic routes for file downloads
            let download_routes = get_download_routes();
            let download_routes_map = download_routes.read().unwrap();

            for (route_path, config) in download_routes_map.iter() {
                let config_clone = config.clone();
                let route_path_clone = route_path.clone();

                let download_handler = move |req: axum::extract::Request| {
                    let config = config_clone.clone();
                    let route_path = route_path_clone.clone();
                    async move {
                        download_handler_impl(req, config, route_path).await
                    }
                };

                // Register route (support wildcard for subfolders)
                let actual_route = route_path.clone();
                app = app.route(&actual_route, get(download_handler));
                info!("📥 Download route registered: {} -> {}", route_path, actual_route);
            }

            // Release lock
            drop(download_routes_map);

            // Add routes for file uploads
            let upload_routes = get_upload_routes();
            let upload_routes_map = upload_routes.read().unwrap();

            for (route_path, config) in upload_routes_map.iter() {
                let config_clone = config.clone();
                let route_path_clone = route_path.clone();

                let upload_handler = move |req: axum::extract::Request| {
                    let config = config_clone.clone();
                    let route_path = route_path_clone.clone();
                    async move {
                        upload_handler_impl(req, config, route_path, dev_mode).await
                    }
                };

                // Register route
                app = app.route(route_path, post(upload_handler));
                info!("📤 Upload route registered: {}", route_path);
            }

            // Release lock
            drop(upload_routes_map);

            // Add middleware to convert 405 to 404 for unsupported methods
            app = app.layer(axum::middleware::from_fn(|req: axum::extract::Request, next: axum::middleware::Next| async move {
                let path = req.uri().path().to_string();
                let resp = next.run(req).await;
                let status = resp.status();

                match status {
                    http::StatusCode::METHOD_NOT_ALLOWED => {
                        // Convert 405 to 404
                        debug!("🔧 Converting 405 to 404 for path: {}", path);

                        // Use html_templates for 405 response
                        crate::html_templates::generate_error_page(
                            http::StatusCode::METHOD_NOT_ALLOWED,
                            "Method Not Allowed",
                            "The HTTP method used is not allowed for this resource.",
                            Some(&format!("Path: {}", path)),
                            false // dev_mode
                        )
                    }
                    _ => resp
                }
            }));

             // Добавляем layer'ы для Request/Response и middleware
            // Слой 1: Формирование Request и Response объектов
            app = app.layer(axum::middleware::from_fn(request_response_layer));

            // Add fallback route for static files
            let timeout_clone = timeout;
            let mut app = app.fallback(move |req: http::Request<axum::body::Body>| async move {
                handle_static_fallback(req, timeout_clone).await
            });


            // Add metrics if enabled
            if metrics_enabled {
                // Initialize metrics
                init_metrics();

                // Add middleware to track HTTP metrics
                app = app.route_layer(axum::middleware::from_fn(track_metrics));

                // Start background task to update metrics periodically
                tokio::spawn(async move {
                    let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(5));
                    loop {
                        interval.tick().await;
                        update_system_metrics();
                        update_websocket_metrics();
                    }
                });

                // Add /metrics endpoint
                app = app.route("/metrics", get(|| async {
                    render_metrics()
                }));

                // Add /health endpoint
                app = app.route("/health", get(|| async {
                    "OK"
                }));

                // Add /info endpoint with process information
                app = app.route("/info", get(|| async {
                    "Use /metrics endpoint for detailed system information"
                }));
                info!("📊 Metrics routes added: /metrics, /health, /info");
            } else {
                info!("📊 Metrics disabled");
            }

            // Start server based on SSL configuration
            if let Some(ssl_config) = &ssl_config {
                // Start HTTPS server using axum-server
                let cert_path = ssl_config.cert_file.as_ref().unwrap();
                let key_path = ssl_config.key_file.as_ref().unwrap();

                match RustlsConfig::from_pem_file(cert_path, key_path).await {
                    Ok(tls_config) => {
                        info!("🔒 Starting HTTPS server with TLS configuration");
                        warn!("🔒 HTTPS server listening on https://{}", addr);

                        // Use axum-server with TLS
                        axum_server::bind_rustls(addr, tls_config)
                            .serve(app.into_make_service())
                            .await
                            .unwrap();
                    }
                    Err(e) => {
                        error!("❌ Failed to create HTTPS configuration: {}", e);
                        warn!("🔄 Falling back to HTTP server");
                        // Fallback to HTTP
                        let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
                        warn!("🌐 HTTP server listening on http://{}", addr);
                        axum::serve(listener, app).await.unwrap();
                    }
                }
            } else {
                // Start HTTP server
                let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
                warn!("🌐 HTTP server listening on http://{}", addr);
                axum::serve(listener, app).await.unwrap();
            }
        });
    });

    // Give server time to start
    std::thread::sleep(std::time::Duration::from_millis(100));

    Ok(cx.undefined())
}
