use env_logger;
use log::LevelFilter;
use neon::prelude::*;
use std::sync::Once;

// Static flag to ensure logger is initialized only once
static INIT: Once = Once::new();

/// Helper functions for extracting configuration options from JavaScript objects
pub mod config_extractor {
    use neon::prelude::*;
    use log;

    /// Extract a string value from an object with a default
    pub fn get_string(cx: &mut FunctionContext, obj: &JsObject, key: &str, default: &str) -> String {
        obj.get::<JsValue, _, _>(cx, key)
            .ok()
            .and_then(|value| value.downcast::<JsString, _>(cx).ok())
            .map(|js_str| js_str.value(cx))
            .unwrap_or_else(|| default.to_string())
    }

    /// Extract a boolean value from an object with a default
    pub fn get_bool(cx: &mut FunctionContext, obj: &JsObject, key: &str, default: bool) -> bool {
        obj.get::<JsValue, _, _>(cx, key)
            .ok()
            .and_then(|value| value.downcast::<JsBoolean, _>(cx).ok())
            .map(|js_bool| js_bool.value(cx))
            .unwrap_or(default)
    }

    /// Extract a number value from an object with a default
    pub fn get_number(cx: &mut FunctionContext, obj: &JsObject, key: &str, default: f64) -> f64 {
        obj.get::<JsValue, _, _>(cx, key)
            .ok()
            .and_then(|value| value.downcast::<JsNumber, _>(cx).ok())
            .map(|js_num| js_num.value(cx))
            .unwrap_or(default)
    }

    /// Extract a number value as u64 from an object with a default
    pub fn get_u64(cx: &mut FunctionContext, obj: &JsObject, key: &str, default: u64) -> u64 {
        get_number(cx, obj, key, default as f64) as u64
    }

    /// Extract a nested object from an object
    pub fn get_object<'a>(cx: &mut FunctionContext<'a>, obj: &JsObject, key: &str) -> Option<Handle<'a, JsObject>> {
        obj.get::<JsValue, _, _>(cx, key)
            .ok()
            .and_then(|value| value.downcast::<JsObject, _>(cx).ok())
    }

    /// Extract and parse IP address from string with fallback to localhost
    pub fn parse_ip_address(host_str: &str) -> [u8; 4] {
        let ip_parts: Result<Vec<u8>, _> =
            host_str.split('.').map(|part| part.parse::<u8>()).collect();

        match ip_parts {
            Ok(parts) if parts.len() == 4 => [parts[0], parts[1], parts[2], parts[3]],
            _ => {
                log::warn!("Invalid IP address: {}, using localhost", host_str);
                [127, 0, 0, 1]
            }
        }
    }

    /// Extract host argument and parse as IP address
    pub fn extract_host(cx: &mut FunctionContext) -> Result<[u8; 4], neon::result::Throw> {
        let host_arg = cx.argument::<JsString>(1)?;
        let host_str = host_arg.value(cx);
        Ok(parse_ip_address(&host_str))
    }

    /// Extract port argument
    pub fn extract_port(cx: &mut FunctionContext) -> Result<u16, neon::result::Throw> {
        let port = cx.argument::<JsNumber>(0)?.value(cx) as u16;
        Ok(port)
    }

    /// Extract SSL configuration from options object
    pub fn extract_ssl_config(cx: &mut FunctionContext, options_obj: &JsObject) -> Option<crate::server::SslConfig> {
        let ssl_obj = get_object(cx, options_obj, "ssl")?;
        let cert_path = get_string(cx, &ssl_obj, "certPath", "");
        let key_path = get_string(cx, &ssl_obj, "keyPath", "");
        
        if cert_path.is_empty() || key_path.is_empty() {
            return None;
        }
        
        match crate::server::SslConfig::from_files(&cert_path, &key_path) {
            Ok(config) => {
                log::info!(
                    "🔒 SSL enabled with certificate: {} and key: {}",
                    cert_path, key_path
                );
                Some(config)
            }
            Err(e) => {
                log::error!("❌ Failed to load SSL certificate: {}, using HTTP only", e);
                None
            }
        }
    }

    /// Extract all common server options from options object
    pub fn extract_server_options(cx: &mut FunctionContext, options_obj: &JsObject) -> (
        Option<crate::server::SslConfig>,
        bool,
        u64,
        bool
    ) {
        let ssl_config = extract_ssl_config(cx, options_obj);
        let metrics_enabled = get_bool(cx, options_obj, "metrics", false);
        let timeout = get_u64(cx, options_obj, "timeout", 30000); // Default 30 seconds
        let dev_mode = get_bool(cx, options_obj, "devMode", false);

        (ssl_config, metrics_enabled, timeout, dev_mode)
    }

    /// Extract all server startup parameters (port, host, options)
    pub fn extract_server_params(cx: &mut FunctionContext) -> Result<(
        u16,
        [u8; 4],
        Option<crate::server::SslConfig>,
        bool,
        u64,
        bool
    ), neon::result::Throw> {
        let port = extract_port(cx)?;
        let host = extract_host(cx)?;
        
        // Get options object (third argument)
        let (ssl_config, metrics_enabled, timeout, dev_mode) = cx.argument::<JsValue>(2)
            .ok()
            .and_then(|options_arg| options_arg.downcast::<JsObject, _>(cx).ok())
            .map(|options_obj| extract_server_options(cx, &options_obj))
            .unwrap_or((None, false, 30000, false));

        Ok((port, host, ssl_config, metrics_enabled, timeout, dev_mode))
    }
}

// Simple greeting function
pub fn hello_wrapper(mut cx: FunctionContext) -> JsResult<JsString> {
    let name = cx.argument::<JsString>(0)?.value(&mut cx);
    let message = format!("Hello {} from RNode Server!", name);
    Ok(cx.string(message))
}

// Function for creating a simple application object
pub fn create_app(mut cx: FunctionContext) -> JsResult<JsObject> {
    let obj = cx.empty_object();

    // Add simple application information
    let app_name = cx.string("RNode Express Server");
    obj.set(&mut cx, "name", app_name)?;

    let version = cx.string("0.1.0");
    obj.set(&mut cx, "version", version)?;

    // Check if log level is passed as argument
    if cx.len() > 0 {
        if let Ok(log_level_str) = cx.argument::<JsString>(0) {
            let level_str = log_level_str.value(&mut cx).to_lowercase();
            let level_str_clone = level_str.clone();

            // Parse log level and set it
            let level_filter = match level_str.as_str() {
                "trace" => LevelFilter::Trace,
                "debug" => LevelFilter::Debug,
                "info" => LevelFilter::Info,
                "warn" => LevelFilter::Warn,
                "error" => LevelFilter::Error,
                _ => LevelFilter::Info, // default
            };

            // Initialize logger only once, then just set the level
            INIT.call_once(|| {
                env_logger::Builder::new().filter_level(level_filter).init();
            });

            // Add log level info to the app object
            let log_level = cx.string(level_str);
            obj.set(&mut cx, "logLevel", log_level)?;

            // Log the initialization
            log::info!(
                "🔧 RNode Server initialized with log level: {}",
                level_str_clone
            );
        }
    } else {
        // Default log level
        INIT.call_once(|| {
            env_logger::Builder::new()
                .filter_level(LevelFilter::Info)
                .init();
        });

        let log_level = cx.string("info");
        obj.set(&mut cx, "logLevel", log_level)?;

        log::info!("🔧 RNode Server initialized with default log level: info");
    }

    Ok(obj)
}
