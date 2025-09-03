use log::debug;
use neon::context::Context as NeonContext;
use neon::prelude::*;
use serde_json::Value as JsonValue;
use std::collections::HashMap;

use super::engine;

/// Initialize templates with configuration
/// Usage: initTemplates(pattern, options)
/// options: { autoescape: boolean }
/// 
/// # Arguments
/// * `cx` - Neon function context
/// 
/// # Returns
/// * `JsResult<JsString>` - JSON response string
/// 
/// # Example JavaScript
/// ```javascript
/// const result = initTemplates("templates/**/*.html", { autoescape: true });
/// const response = JSON.parse(result);
/// if (response.success) {
///     console.log("Templates initialized");
/// } else {
///     console.error("Error:", response.error);
/// }
/// ```
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
        Err(_) => true, // default value
    };

    match engine::init_templates(&pattern, autoescape) {
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
/// 
/// # Arguments
/// * `cx` - Neon function context
/// 
/// # Returns
/// * `JsResult<JsString>` - JSON response string with rendered content
/// 
/// # Example JavaScript
/// ```javascript
/// const context = { name: "World", items: ["item1", "item2"] };
/// const result = renderTemplate("hello.html", JSON.stringify(context));
/// const response = JSON.parse(result);
/// if (response.success) {
///     console.log("Rendered:", response.content);
/// } else {
///     console.error("Error:", response.error);
/// }
/// ```
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

    match engine::render_template(&template_name, context) {
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