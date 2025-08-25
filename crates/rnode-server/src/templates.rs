use neon::prelude::*;
use neon::context::Context as NeonContext;
use std::collections::HashMap;
use serde_json::{Map, Value as JsonValue};
use std::sync::{Mutex, OnceLock};
use std::error::Error as StdError;
use tera::{Context, Tera};
use log::{info, debug, warn, error};

// Global Tera instance for template management
static TEMPLATES: OnceLock<Mutex<Option<Tera>>> = OnceLock::new();

/// Initialize Tera templates with configuration
pub fn init_templates(
    pattern: &str,
    autoescape: bool,
) -> Result<(), String> {
    let mut tera = Tera::new(pattern)
        .map_err(|e| format!("Failed to parse templates: {}", e))?;
    
    // Configure autoescape
    if autoescape {
        tera.autoescape_on(vec![".html", ".htm", ".xml"]);
    } else {
        tera.autoescape_on(vec![]);
    }
    
    // Get list of loaded templates before moving tera
    let template_names: Vec<String> = tera.get_template_names().map(|s| s.to_string()).collect();
    
    let templates = TEMPLATES.get_or_init(|| Mutex::new(None));
    let mut templates = templates.lock().unwrap();
    *templates = Some(tera);
    
    info!("✅ Templates initialized from pattern: {} (autoescape: {})", pattern, autoescape);
    info!("📁 Loaded {} templates:", template_names.len());
    
    if template_names.is_empty() {
        warn!("   ⚠️  No templates found! Check pattern: {}", pattern);
        debug!("   🔍 Current working directory: {:?}", std::env::current_dir().unwrap_or_default());
        debug!("   📂 Pattern resolved to: {}", pattern);
    } else {
        for (i, name) in template_names.iter().enumerate() {
            debug!("   {}. {}", i + 1, name);
        }
    }
    
    Ok(())
}

/// Render a template with context
pub fn render_template(template_name: &str, context: HashMap<String, JsonValue>) -> Result<String, String> {
    let templates = TEMPLATES.get_or_init(|| Mutex::new(None));
    let templates = templates.lock().unwrap();
    
    if let Some(ref tera) = *templates {
        // Convert HashMap to serde_json::Map
        let mut json_map = Map::new();
        for (key, value) in context {
            json_map.insert(key, value);
        }
        
        let tera_context = Context::from_value(JsonValue::Object(json_map))
            .map_err(|e| format!("Failed to create context: {}", e))?;
        
        let result = tera.render(template_name, &tera_context)
            .map_err(|e| {
                let error_msg = format!("{}", e);
                error!("📝 Template render error: {}", error_msg);
                
                // Try to get the root cause of the error
                let mut current_error: &dyn StdError = &e;
                let mut error_chain = vec![error_msg.clone()];
                
                while let Some(source) = current_error.source() {
                    error_chain.push(format!("{}", source));
                    current_error = source;
                }
                
                // Show the most specific error (usually the last one)
                let specific_error = error_chain.last().unwrap_or(&error_msg);
                let detailed_error = format!("Template error in '{}': {}", template_name, specific_error);
                
                debug!("📝 Error chain: {:?}", error_chain);
                detailed_error
            })?;
        
        Ok(result)
    } else {
        Err("Templates not initialized. Call initTemplates() first.".to_string())
    }
}

// Neon wrapper functions

/// Initialize templates with configuration
/// Usage: initTemplates(pattern, options)
/// options: { autoescape: boolean }
pub fn init_templates_wrapper(mut cx: FunctionContext) -> JsResult<JsString> {
    let pattern = cx.argument::<JsString>(0)?.value(&mut cx);
    let options = cx.argument::<JsObject>(1)?;
    
    // Extract options with proper error handling
    let autoescape = match options.get::<JsValue, _, _>(&mut cx, "autoescape") {
        Ok(val) => {
            if let Ok(bool_val) = val.downcast::<JsBoolean, _>(&mut cx) {
                bool_val.value(&mut cx)
            } else {
                true // default value
            }
        }
        Err(_) => true // default value
    };
    
    match init_templates(&pattern, autoescape) {
        Ok(_) => {
            let response = serde_json::json!({
                "success": true,
                "message": "Templates initialized"
            });
            Ok(cx.string(response.to_string()))
        }
        Err(e) => {
            let response = serde_json::json!({
                "success": false,
                "error": e
            });
            Ok(cx.string(response.to_string()))
        }
    }
}

/// Render a template
/// Usage: renderTemplate(templateName, context)
pub fn render_template_wrapper(mut cx: FunctionContext) -> JsResult<JsString> {
    let template_name = cx.argument::<JsString>(0)?.value(&mut cx);
    let context_str = cx.argument::<JsString>(1)?.value(&mut cx);
    
    // Parse JSON string to HashMap
    let context: HashMap<String, JsonValue> = match serde_json::from_str(&context_str) {
        Ok(parsed) => parsed,
        Err(e) => {
            let response = serde_json::json!({
                "success": false,
                "error": format!("Invalid JSON: {}", e)
            });
            return Ok(cx.string(response.to_string()));
        }
    };
    
    match render_template(&template_name, context) {
        Ok(result) => {
            let response = serde_json::json!({
                "success": true,
                "content": result
            });
            Ok(cx.string(response.to_string()))
        }
        Err(e) => {
            debug!("🔍 DEBUG: render_template returned error: {}", e);
            let response = serde_json::json!({
                "success": false,
                "error": e
            });
            debug!("🔍 DEBUG: JSON response: {}", response.to_string());
            Ok(cx.string(response.to_string()))
        }
    }
}