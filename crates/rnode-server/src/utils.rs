use env_logger;
use log::LevelFilter;
use neon::prelude::*;
use std::sync::Once;

// Static flag to ensure logger is initialized only once
static INIT: Once = Once::new();

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
