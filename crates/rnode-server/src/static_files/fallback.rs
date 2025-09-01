use crate::request::Request;
use crate::handlers::middleware;
use axum::body::Body;
use axum::response::Response;
use http;
use log::debug;

// Function for handling static file fallback
pub async fn handle_static_fallback(
    req: http::Request<axum::body::Body>,
    timeout: u64,
) -> Response<Body> {
    let path = req.uri().path().to_string();

    // Разделяем запрос на части
    let (parts, body) = req.into_parts();

    // Извлекаем тело запроса
    let body_bytes = axum::body::to_bytes(body, usize::MAX).await.ok();

    // Создаем новый запрос из частей
    let req = http::Request::from_parts(parts, Body::empty());

    // Получаем готовые Request и Response объекты из extensions
    let mut request = Request::from_axum_request(&req);
    if let Some(body_bytes) = body_bytes {
        use crate::request_parser::RequestParser;
        let (parsed_body, files) = RequestParser::parse_request_body(&body_bytes, &request.content_type).await;
        request.body = parsed_body;
        request.files = files;
    }

    // Обновляем path в Request объекте
    request.path = path.clone();

    // First try to find static file
    let accept_encoding = req.headers().get("accept-encoding").and_then(|h| h.to_str().ok());
    if let Some(mut static_response) = super::handle_static_file(path, accept_encoding).await {
        // Применяем middleware к статическому файлу с оставшимся временем
        let mut remaining_timeout = timeout;
        debug!("⏱️ Static file middleware - Initial timeout: {}ms", remaining_timeout);
        if let Err(_) = middleware::execute_middleware(&mut request, &mut remaining_timeout, false).await {
            // Если middleware вернул ошибку, возвращаем 500
            return axum::response::Response::builder()
                .status(http::StatusCode::INTERNAL_SERVER_ERROR)
                .body(axum::body::Body::from("Internal Server Error"))
                .unwrap();
        }
        
        debug!("⏱️ Static file middleware - Remaining timeout after execution: {}ms", remaining_timeout);

        // Получаем данные из Response объекта после middleware
        let headers = request.get_headers().clone();

        // Добавляем заголовки
        for (key, value) in headers {
            if let Ok(header_value) = value.parse() {
                // Создаём HeaderName из строки (он сам хранит owned-значение)
                if let Ok(header_name) = http::header::HeaderName::from_bytes(key.as_bytes()) {
                    static_response.headers_mut().insert(header_name, header_value);
                }
            }
        }

        let cookies = request.get_cookies().clone();
        // Добавляем cookies
        for cookie in cookies {
            if let Ok(header_value) = cookie.parse() {
                static_response.headers_mut().insert("set-cookie", header_value);
            }
        }

        return static_response;
    }

    // If static file not found, return 404
    axum::response::Response::builder()
        .status(http::StatusCode::NOT_FOUND)
        .body(axum::body::Body::from("Not Found"))
        .unwrap()
}
