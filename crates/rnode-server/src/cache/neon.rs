use neon::prelude::*;
use crate::cache::{init_cache_system, cache_get, cache_set, cache_delete, cache_exists, cache_clear, cache_flush_by_tags};
use crate::cache::types::*;
use log::{debug, error};

pub fn init_cache_system_wrapper(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let config_obj = cx.argument::<JsObject>(0)?;
    
    let default_ttl = config_obj.get::<JsNumber, _, _>(&mut cx, "defaultTtl")?
        .value(&mut cx) as u64;
    
    let redis_url = if let Ok(redis_url) = config_obj.get::<JsString, _, _>(&mut cx, "redisUrl") {
        Some(redis_url.value(&mut cx))
    } else {
        None
    };
    
    let file_cache_path = config_obj.get::<JsString, _, _>(&mut cx, "fileCachePath")?
        .value(&mut cx);
    
    let config = CacheConfig {
        default_ttl,
        redis_url,
        file_cache_path,
    };
    
    match init_cache_system(config) {
        Ok(_) => {
            debug!("✅ Cache system initialized successfully");
            Ok(cx.undefined())
        }
        Err(e) => {
            error!("❌ Failed to initialize cache system: {}", e);
            cx.throw_error(e.to_string())
        }
    }
}

pub fn cache_get_wrapper(mut cx: FunctionContext) -> JsResult<JsValue> {
    let key = cx.argument::<JsString>(0)?.value(&mut cx);
    
    let mut tags: Option<Vec<String>> = None;
    
    // Проверяем второй параметр - может быть tags (array)
    if cx.len() > 1 {
        if let Ok(tags_array) = cx.argument::<JsArray>(1) {
            let tags_vec: Vec<String> = tags_array.to_vec(&mut cx)?
                .into_iter()
                .map(|v| v.downcast::<JsString, _>(&mut cx).unwrap().value(&mut cx))
                .collect();
            tags = Some(tags_vec);
        }
    }
    
    let options = CacheOptions { ttl: None, tags: tags.unwrap_or_default() };
    
    debug!("🔍 Cache get request for key: {}", key);
    
    match cache_get::<String>(&key, &options) {
        Ok(Some(value)) => {
            debug!("✅ Cache hit for key: {}", key);
            Ok(cx.string(value).upcast())
        }
        Ok(None) => {
            debug!("❌ Cache miss for key: {}", key);
            Ok(cx.null().upcast())
        }
        Err(e) => {
            error!("❌ Cache error for key {}: {}", key, e);
            cx.throw_error(e.to_string())
        }
    }
}

pub fn cache_set_wrapper(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let key = cx.argument::<JsString>(0)?.value(&mut cx);
    let value = cx.argument::<JsString>(1)?.value(&mut cx);
    
    // Получаем tags как обязательный третий параметр
    let tags_array = cx.argument::<JsArray>(2)?;
    let tags: Vec<String> = tags_array.to_vec(&mut cx)?
        .into_iter()
        .map(|v| v.downcast::<JsString, _>(&mut cx).unwrap().value(&mut cx))
        .collect();
    
    // Получаем ttl как обязательный четвертый параметр
    let ttl_value = cx.argument::<JsNumber>(3)?;
    let ttl_val = ttl_value.value(&mut cx) as u64;
    let ttl: Option<u64> = if ttl_val > 0 {
        Some(ttl_val)
    } else {
        None
    };
    
    let options = CacheOptions { ttl, tags };
    
    debug!("💾 Cache set request for key: {}", key);
    
    match cache_set(&key, value, &options) {
        Ok(_) => {
            debug!("✅ Cache set success for key: {}", key);
            Ok(cx.boolean(true))
        }
        Err(e) => {
            error!("❌ Cache set error for key {}: {}", key, e);
            cx.throw_error(e.to_string())
        }
    }
}

pub fn cache_delete_wrapper(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let key = cx.argument::<JsString>(0)?.value(&mut cx);
    
    let mut tags: Option<Vec<String>> = None;
    
    // Проверяем второй параметр - может быть tags (array)
    if cx.len() > 1 {
        if let Ok(tags_array) = cx.argument::<JsArray>(1) {
            let tags_vec: Vec<String> = tags_array.to_vec(&mut cx)?
                .into_iter()
                .map(|v| v.downcast::<JsString, _>(&mut cx).unwrap().value(&mut cx))
                .collect();
            tags = Some(tags_vec);
        }
    }
    
    let options = CacheOptions { ttl: None, tags: tags.unwrap_or_default() };
    
    debug!("🗑️ Cache delete request for key: {}", key);
    
    match cache_delete(&key, &options) {
        Ok(deleted) => {
            debug!("✅ Cache delete result for key {}: {}", key, deleted);
            Ok(cx.boolean(deleted))
        }
        Err(e) => {
            error!("❌ Cache delete error for key {}: {}", key, e);
            cx.throw_error(e.to_string())
        }
    }
}

pub fn cache_exists_wrapper(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let key = cx.argument::<JsString>(0)?.value(&mut cx);
    
    let mut tags: Option<Vec<String>> = None;
    
    // Проверяем второй параметр - может быть tags (array)
    if cx.len() > 1 {
        if let Ok(tags_array) = cx.argument::<JsArray>(1) {
            let tags_vec: Vec<String> = tags_array.to_vec(&mut cx)?
                .into_iter()
                .map(|v| v.downcast::<JsString, _>(&mut cx).unwrap().value(&mut cx))
                .collect();
            tags = Some(tags_vec);
        }
    }
    
    let options = CacheOptions { ttl: None, tags: tags.unwrap_or_default() };
    
    debug!("🔍 Cache exists request for key: {}", key);
    
    match cache_exists(&key, &options) {
        Ok(exists) => {
            debug!("✅ Cache exists result for key {}: {}", key, exists);
            Ok(cx.boolean(exists))
        }
        Err(e) => {
            error!("❌ Cache exists error for key {}: {}", key, e);
            cx.throw_error(e.to_string())
        }
    }
}

pub fn cache_clear_wrapper(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    debug!("🗑️ Cache clear request");
    
    match cache_clear() {
        Ok(_) => {
            debug!("✅ Cache clear success");
            Ok(cx.boolean(true))
        }
        Err(e) => {
            error!("❌ Cache clear error: {}", e);
            cx.throw_error(e.to_string())
        }
    }
}

pub fn cache_flush_by_tags_wrapper(mut cx: FunctionContext) -> JsResult<JsNumber> {
    debug!("🏷️ Cache flush by tags wrapper called");
    
    let tags_array = cx.argument::<JsArray>(0)?;
    let tags: Vec<String> = tags_array.to_vec(&mut cx)?
        .into_iter()
        .map(|v| v.downcast::<JsString, _>(&mut cx).unwrap().value(&mut cx))
        .collect();
    
    debug!("🏷️ Tags to flush: {:?}", tags);
    
    match cache_flush_by_tags(&tags) {
        Ok(count) => {
            debug!("✅ Cache flush by tags success: {} items", count);
            Ok(cx.number(count as f64))
        }
        Err(e) => {
            debug!("❌ Cache flush by tags error: {}", e);
            cx.throw_error(format!("Cache flush by tags error: {}", e))
        }
    }
}
