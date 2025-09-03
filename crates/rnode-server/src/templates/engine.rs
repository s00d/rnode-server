use log::{debug, error, info, warn};
use serde_json::{Map, Value as JsonValue};
use std::collections::HashMap;
use std::error::Error as StdError;
use std::sync::{Mutex, OnceLock};
use tera::{Context, Tera};

// Global Tera instance for template management
static TEMPLATES: OnceLock<Mutex<Option<Tera>>> = OnceLock::new();

pub fn init_templates(pattern: &str, autoescape: bool) -> Result<(), String> {
    let mut tera = Tera::new(pattern).map_err(|e| format!("Failed to parse templates: {}", e))?;

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

    info!(
        "✅ Templates initialized from pattern: {} (autoescape: {})",
        pattern, autoescape
    );
    info!("📁 Loaded {} templates:", template_names.len());

    if template_names.is_empty() {
        warn!("   ⚠️  No templates found! Check pattern: {}", pattern);
        debug!(
            "   🔍 Current working directory: {:?}",
            std::env::current_dir().unwrap_or_default()
        );
        debug!("   📂 Pattern resolved to: {}", pattern);
    } else {
        for (i, name) in template_names.iter().enumerate() {
            debug!("   {}. {}", i + 1, name);
        }
    }

    Ok(())
}

pub fn render_template(
    template_name: &str,
    context: HashMap<String, JsonValue>,
) -> Result<String, String> {
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

        let result = tera.render(template_name, &tera_context).map_err(|e| {
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
            let detailed_error =
                format!("Template error in '{}': {}", template_name, specific_error);

            debug!("📝 Error chain: {:?}", error_chain);
            detailed_error
        })?;

        Ok(result)
    } else {
        Err("Templates not initialized. Call initTemplates() first.".to_string())
    }
}