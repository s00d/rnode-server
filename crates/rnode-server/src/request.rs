use log::debug;
use serde_json::{Map, Value};

/// Общая структура для представления HTTP сообщения (запроса и ответа)
#[derive(Clone)]
pub struct HttpMessage {
    // Request fields
    pub method: String,
    pub path: String,
    pub registered_path: String,
    pub body: Value,
    pub files: Value,
    pub content_type: String,
    pub cookies: Map<String, Value>,
    pub headers: Map<String, Value>,
    pub ip: String,
    pub ips: Vec<String>,
    pub ip_source: String,
    pub path_params: Map<String, Value>,
    pub query_params: Map<String, Value>,
    pub custom_params: Map<String, Value>,

    // Response fields
    pub content: Value,
    pub status: u16,
}

impl HttpMessage {
    /// Creates a new HttpMessage instance for request
    pub fn new_request(data: Map<String, Value>) -> Self {
        let headers = data
            .get("headers")
            .and_then(|v| v.as_object())
            .cloned()
            .unwrap_or(Map::new());

        let (ip, ips, ip_source) = Self::extract_ip_from_headers(&headers);

        Self {
            method: data
                .get("method")
                .and_then(|v| v.as_str())
                .unwrap_or("GET")
                .to_string(),
            path: data
                .get("path")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            registered_path: data
                .get("registeredPath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            body: data.get("body").cloned().unwrap_or(Value::Null),
            files: data.get("files").cloned().unwrap_or(Value::Null),
            content_type: data
                .get("contentType")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            cookies: data
                .get("cookies")
                .and_then(|v| v.as_object())
                .cloned()
                .unwrap_or(Map::new()),
            headers,
            ip,
            ips,
            ip_source,
            path_params: data
                .get("pathParams")
                .and_then(|v| v.as_object())
                .cloned()
                .unwrap_or(Map::new()),
            query_params: data
                .get("queryParams")
                .and_then(|v| v.as_object())
                .cloned()
                .unwrap_or(Map::new()),
            custom_params: data
                .get("customParams")
                .and_then(|v| v.as_object())
                .cloned()
                .unwrap_or(Map::new()),

            // Response fields initialization
            content: Value::String(String::new()),
            status: 200,
        }
    }

    /// Извлекает IP адрес из заголовков
    fn extract_ip_from_headers(headers: &Map<String, Value>) -> (String, Vec<String>, String) {
        // Priority order for IP extraction (most trusted first)
        let ip_headers = [
            "cf-connecting-ip",    // Cloudflare (most trusted)
            "x-real-ip",           // Nginx proxy
            "x-forwarded-for",     // Standard proxy header
            "x-client-ip",         // Custom proxy header
            "x-forwarded",         // Alternative proxy header
            "forwarded-for",       // RFC 7239
            "forwarded",           // RFC 7239
            "x-cluster-client-ip", // Load balancer
            "x-remote-ip",         // Custom remote IP
            "x-remote-addr",       // Alternative remote addr
        ];

        let mut all_ips = Vec::new();
        let mut primary_ip = String::new();
        let mut ip_source = "default".to_string();

        // Try to extract IP from various headers
        for header_name in &ip_headers {
            if let Some(header_value) = headers.get(*header_name) {
                if let Some(value_str) = header_value.as_str() {
                    let ips: Vec<&str> = value_str.split(',').collect();

                    // Add all valid IPs to the list
                    for ip in &ips {
                        let clean_ip = ip.trim();
                        if !clean_ip.is_empty()
                            && Self::is_valid_ip(clean_ip)
                            && !all_ips.contains(&clean_ip.to_string())
                        {
                            all_ips.push(clean_ip.to_string());
                        }
                    }

                    // Set primary IP from first valid header found
                    if primary_ip.is_empty() && !ips.is_empty() {
                        let first_ip = ips[0].trim();
                        if Self::is_valid_ip(first_ip) {
                            primary_ip = first_ip.to_string();
                            ip_source = header_name.to_string();
                        }
                    }

                    // If we found valid IPs, break (don't check lower priority headers)
                    if !primary_ip.is_empty() {
                        break;
                    }
                }
            }
        }

        // If no IP found in headers, use default localhost
        if primary_ip.is_empty() {
            primary_ip = "127.0.0.1".to_string();
            if all_ips.is_empty() {
                all_ips.push("127.0.0.1".to_string());
            }
        }

        (primary_ip, all_ips, ip_source)
    }

    /// Проверяет валидность IP адреса
    fn is_valid_ip(ip: &str) -> bool {
        // Basic IP validation (IPv4 and IPv6)
        if ip.is_empty() {
            return false;
        }

        // Check for private/local IPs that might be invalid
        let invalid_prefixes = [
            "0.",
            "127.",
            "10.",
            "172.16.",
            "172.17.",
            "172.18.",
            "172.19.",
            "172.20.",
            "172.21.",
            "172.22.",
            "172.23.",
            "172.24.",
            "172.25.",
            "172.26.",
            "172.27.",
            "172.28.",
            "172.29.",
            "172.30.",
            "172.31.",
            "192.168.",
            "169.254.",
            "224.",
            "240.",
            "255.255.255.255",
        ];

        for prefix in &invalid_prefixes {
            if ip.starts_with(prefix) && ip != "127.0.0.1" {
                return false;
            }
        }

        // Basic format check (simplified)
        let parts: Vec<&str> = ip.split('.').collect();
        if parts.len() == 4 {
            for part in parts {
                if let Ok(_num) = part.parse::<u8>() {
                    // u8 is already 0-255, so no need to check > 255
                    // Just verify it's a valid number
                } else {
                    return false;
                }
            }
            return true;
        }

        // IPv6 basic check (simplified)
        if ip.contains(':') {
            return ip.len() <= 39 && ip.chars().all(|c| c.is_ascii_hexdigit() || c == ':');
        }

        false
    }

    /// Получает значение заголовка по имени (без учета регистра)
    pub fn get_header(&self, name: &str) -> Option<&str> {
        let name_lower = name.to_lowercase();
        for (key, value) in &self.headers {
            if key.to_lowercase() == name_lower {
                return value.as_str();
            }
        }
        None
    }

    /// Проверяет, является ли тело запроса JSON
    pub fn is_json(&self) -> bool {
        self.content_type.contains("application/json")
    }

    /// Проверяет, является ли тело запроса формой
    pub fn is_form(&self) -> bool {
        self.content_type.contains("multipart/form-data")
            || self
                .content_type
                .contains("application/x-www-form-urlencoded")
    }

    /// Проверяет, содержит ли запрос файлы
    pub fn has_files(&self) -> bool {
        self.files.is_object() && !self.files.as_object().unwrap().is_empty()
    }

    /// Получает количество файлов
    pub fn get_file_count(&self) -> usize {
        self.files.as_object().map(|obj| obj.len()).unwrap_or(0)
    }

    /// Получает form data как HashMap
    pub fn get_form_data(&self) -> std::collections::HashMap<String, String> {
        if self.is_form() {
            if let Some(body_obj) = self.body.as_object() {
                let mut form_data = std::collections::HashMap::new();
                for (key, value) in body_obj {
                    if let Some(value_str) = value.as_str() {
                        form_data.insert(key.clone(), value_str.to_string());
                    }
                }
                return form_data;
            }
        }
        std::collections::HashMap::new()
    }

    /// Получает размер тела запроса
    pub fn get_body_size(&self) -> usize {
        match &self.body {
            Value::String(s) => s.len(),
            Value::Object(obj) => obj.len(),
            Value::Array(arr) => arr.len(),
            _ => 0,
        }
    }

    /// Проверяет, является ли запрос AJAX
    pub fn is_ajax(&self) -> bool {
        self.get_header("X-Requested-With")
            .map(|v| v == "XMLHttpRequest")
            .unwrap_or(false)
    }

    /// Проверяет, является ли запрос API
    pub fn is_api(&self) -> bool {
        self.path.starts_with("/api/")
            || self
                .get_header("Accept")
                .map(|v| v.contains("application/json"))
                .unwrap_or(false)
    }

    /// Получает User-Agent
    pub fn get_user_agent(&self) -> Option<&str> {
        self.get_header("User-Agent")
    }

    /// Проверяет, является ли запрос от мобильного устройства
    pub fn is_mobile(&self) -> bool {
        self.get_user_agent()
            .map(|ua| {
                ua.to_lowercase().contains("mobile")
                    || ua.to_lowercase().contains("android")
                    || ua.to_lowercase().contains("iphone")
                    || ua.to_lowercase().contains("ipad")
            })
            .unwrap_or(false)
    }

    /// Получает язык из Accept-Language
    pub fn get_language(&self) -> Option<&str> {
        self.get_header("Accept-Language")
            .and_then(|lang| lang.split(',').next())
            .map(|lang| lang.trim())
    }

    /// Возвращает все заголовки как Vec<(String, String)>
    pub fn get_headers(&self) -> Vec<(String, String)> {
        self.headers
            .iter()
            .filter_map(|(k, v)| v.as_str().map(|val| (k.clone(), val.to_string())))
            .collect()
    }

    /// Возвращает все cookies как Vec<String>
    pub fn get_cookies(&self) -> Vec<String> {
        self.cookies
            .iter()
            .filter_map(|(k, v)| v.as_str().map(|val| format!("{}={}", k, val)))
            .collect()
    }

    /// Конвертирует HttpMessage обратно в JSON Map для передачи в JavaScript
    pub fn to_json_map(&self) -> Map<String, Value> {
        let mut map = Map::new();

        // Request fields
        map.insert("method".to_string(), Value::String(self.method.clone()));
        map.insert("path".to_string(), Value::String(self.path.clone()));
        map.insert(
            "registeredPath".to_string(),
            Value::String(self.registered_path.clone()),
        );
        map.insert("body".to_string(), self.body.clone());
        map.insert("files".to_string(), self.files.clone());
        map.insert(
            "contentType".to_string(),
            Value::String(self.content_type.clone()),
        );
        map.insert("cookies".to_string(), Value::Object(self.cookies.clone()));
        map.insert("headers".to_string(), Value::Object(self.headers.clone()));
        map.insert("ip".to_string(), Value::String(self.ip.clone()));
        map.insert(
            "ips".to_string(),
            Value::Array(
                self.ips
                    .iter()
                    .map(|ip| Value::String(ip.clone()))
                    .collect(),
            ),
        );
        map.insert(
            "ipSource".to_string(),
            Value::String(self.ip_source.clone()),
        );
        map.insert(
            "pathParams".to_string(),
            Value::Object(self.path_params.clone()),
        );
        map.insert(
            "queryParams".to_string(),
            Value::Object(self.query_params.clone()),
        );
        map.insert(
            "customParams".to_string(),
            Value::Object(self.custom_params.clone()),
        );

        // Response fields
        map.insert("content".to_string(), self.content.clone());
        map.insert(
            "status".to_string(),
            Value::Number(serde_json::Number::from(self.status)),
        );

        map
    }

    /// Creates HttpMessage from axum Request (for layer system)
    pub fn from_axum_request(req: &axum::extract::Request) -> Self {
        // Extract basic information
        let method = req.method().to_string();
        let path = req.uri().path().to_string();
        let content_type = req
            .headers()
            .get("content-type")
            .and_then(|h| h.to_str().ok())
            .unwrap_or("")
            .to_string();

        // Extract cookies
        let mut cookies_map = Map::new();

        // Обрабатываем все заголовки cookie (может быть несколько)
        for (name, value) in req.headers() {
            if name.as_str().to_lowercase() == "cookie" {
                if let Ok(cookie_str) = value.to_str() {
                    debug!("🔍 Parsing cookie header: '{}'", cookie_str);

                    // Разделяем строку по '; ' для получения всех cookies
                    for cookie_pair in cookie_str.split("; ") {
                        if let Some((key, value)) = cookie_pair.split_once('=') {
                            let key_trimmed = key.trim();
                            let value_trimmed = value.trim();
                            debug!("🍪 Cookie: '{}' = '{}'", key_trimmed, value_trimmed);
                            cookies_map.insert(
                                key_trimmed.to_string(),
                                Value::String(value_trimmed.to_string()),
                            );
                        }
                    }
                }
            }
        }

        // Конвертируем заголовки в Map<String, Value>
        let mut headers_map = Map::new();
        for (key, value) in req.headers() {
            if let Ok(value_str) = value.to_str() {
                headers_map.insert(key.to_string(), Value::String(value_str.to_string()));
            }
        }

        // Extract IP from headers
        let (ip, ips, ip_source) = Self::extract_ip_from_headers(&headers_map);

        // Extract status from headers (if available)
        let mut status = 200; // Default 200 OK
        if let Some(status_header) = req.headers().get("status") {
            if let Ok(status_str) = status_header.to_str() {
                if let Ok(status_code) = status_str.parse::<u16>() {
                    status = status_code;
                    debug!("🔍 Status from header: {}", status);
                }
            }
        }

        // Extract query parameters
        let mut query_params = Map::new();
        if let Some(query) = req.uri().query() {
            for pair in query.split('&') {
                if let Some((key, value)) = pair.split_once('=') {
                    let decoded_key = urlencoding::decode(key)
                        .unwrap_or_else(|_| std::borrow::Cow::Borrowed(key))
                        .into_owned();
                    let decoded_value = urlencoding::decode(value)
                        .unwrap_or_else(|_| std::borrow::Cow::Borrowed(value))
                        .into_owned();
                    query_params.insert(decoded_key, Value::String(decoded_value));
                }
            }
        }

        let http_message = Self {
            method,
            path: path.clone(),
            registered_path: path, // Будет обновлено позже
            body: Value::Null,     // Будет заполнено позже
            files: Value::Null,    // Будет заполнено позже
            content_type: content_type.clone(),
            cookies: cookies_map,
            headers: headers_map,
            ip,
            ips,
            ip_source,
            path_params: Map::new(), // Будет заполнено позже
            query_params,
            custom_params: Map::new(),

            // Response fields initialization
            content: Value::String(String::new()),
            status,
        };

        http_message
    }

    pub fn update_request_field(request: &mut HttpMessage, key: &str, value: &serde_json::Value) {
        // Create temporary object with updated field
        let mut temp_data = request.to_json_map();
        temp_data.insert(key.to_string(), value.clone());

        // Автоматически обновляем все поля request
        let updated_request = HttpMessage::new_request(temp_data);
        *request = updated_request;
    }
}

// Type aliases for backward compatibility
pub type Request = HttpMessage;
