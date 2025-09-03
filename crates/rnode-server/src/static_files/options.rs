use neon::prelude::*;
use super::types::StaticOptions;

// Function for parsing options from JavaScript object
pub fn parse_static_options(cx: &mut FunctionContext, options_obj: Handle<JsObject>) -> StaticOptions {
    let mut options = StaticOptions::default();

    // Parse cache
    if let Ok(cache) = options_obj.get::<JsBoolean, _, _>(cx, "cache") {
        options.cache = cache.value(cx);
    }

    // Parse maxAge
    if let Ok(max_age) = options_obj.get::<JsNumber, _, _>(cx, "maxAge") {
        options.max_age = Some(max_age.value(cx) as u32);
    }

    // Parse maxFileSize
    if let Ok(max_file_size) = options_obj.get::<JsNumber, _, _>(cx, "maxFileSize") {
        options.max_file_size = Some(max_file_size.value(cx) as usize);
    }

    // Parse etag
    if let Ok(etag) = options_obj.get::<JsBoolean, _, _>(cx, "etag") {
        options.etag = etag.value(cx);
    }

    // Parse lastModified
    if let Ok(last_modified) = options_obj.get::<JsBoolean, _, _>(cx, "lastModified") {
        options.last_modified = last_modified.value(cx);
    }

    // Parse gzip
    if let Ok(gzip) = options_obj.get::<JsBoolean, _, _>(cx, "gzip") {
        options.gzip = gzip.value(cx);
    }

    // Parse brotli
    if let Ok(brotli) = options_obj.get::<JsBoolean, _, _>(cx, "brotli") {
        options.brotli = brotli.value(cx);
    }

    // Parse zstd
    if let Ok(zstd) = options_obj.get::<JsBoolean, _, _>(cx, "zstd") {
        options.zstd = zstd.value(cx);
    }

    // Parse lz4
    if let Ok(lz4) = options_obj.get::<JsBoolean, _, _>(cx, "lz4") {
        options.lz4 = lz4.value(cx);
    }

    // Parse security options directly
    if let Ok(allow_hidden) = options_obj.get::<JsBoolean, _, _>(cx, "allowHiddenFiles") {
        options.allow_hidden_files = allow_hidden.value(cx);
    }
    if let Ok(allow_system) = options_obj.get::<JsBoolean, _, _>(cx, "allowSystemFiles") {
        options.allow_system_files = allow_system.value(cx);
    }
    if let Ok(allowed_ext) = options_obj.get::<JsArray, _, _>(cx, "allowedExtensions") {
        let mut extensions = Vec::new();
        for i in 0..allowed_ext.len(cx) {
            if let Ok(ext) = allowed_ext.get::<JsString, _, _>(cx, i) {
                extensions.push(ext.value(cx));
            }
        }
        if !extensions.is_empty() {
            options.allowed_extensions = extensions;
        }
    }
    if let Ok(blocked_paths) = options_obj.get::<JsArray, _, _>(cx, "blockedPaths") {
        let mut paths = Vec::new();
        for i in 0..blocked_paths.len(cx) {
            if let Ok(path) = blocked_paths.get::<JsString, _, _>(cx, i) {
                paths.push(path.value(cx));
            }
        }
        if !paths.is_empty() {
            options.blocked_paths = paths;
        }
    }

    options
}
