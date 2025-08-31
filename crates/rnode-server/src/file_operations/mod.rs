pub mod types;
pub mod operations;
pub mod routes;
pub mod utils;
pub mod handlers;

use neon::prelude::*;
use serde_json;
use std::path::Path;
use self::operations::{save_file_impl, delete_file_impl, get_file_content_impl, download_file_impl};
use self::routes::{register_download_route_impl, register_upload_route_impl};
use self::utils::scan_directory;

// Function for saving file
pub fn save_file(mut cx: FunctionContext) -> JsResult<JsString> {
    let filename = cx.argument::<JsString>(0)?.value(&mut cx);
    let base64_data = cx.argument::<JsString>(1)?.value(&mut cx);
    let uploads_dir = cx.argument::<JsString>(2)?.value(&mut cx);

    Ok(cx.string(save_file_impl(&filename, &base64_data, &uploads_dir)))
}

// Function for deleting file
pub fn delete_file(mut cx: FunctionContext) -> JsResult<JsString> {
    let filename = cx.argument::<JsString>(0)?.value(&mut cx);
    let uploads_dir = cx.argument::<JsString>(1)?.value(&mut cx);

    Ok(cx.string(delete_file_impl(&filename, &uploads_dir)))
}

// Function for getting list of files with subfolders
pub fn list_files(mut cx: FunctionContext) -> JsResult<JsString> {
    let uploads_dir = cx.argument::<JsString>(0)?.value(&mut cx);

    if !Path::new(&uploads_dir).exists() {
        return Ok(cx.string("{\"success\":true,\"files\":[],\"folders\":[],\"total\":0}"));
    }

    match scan_directory(Path::new(&uploads_dir), Path::new(&uploads_dir)) {
        Ok(files) => {
            let result = serde_json::json!({
                "success": true,
                "files": files.iter().map(|f| {
                    serde_json::json!({
                        "name": f.name,
                        "size": f.size,
                        "created": f.created,
                        "modified": f.modified,
                        "mime_type": f.mime_type,
                        "path": f.path,
                        "relative_path": f.relative_path
                    })
                }).collect::<Vec<_>>(),
                "total": files.len()
            });

            Ok(cx.string(result.to_string()))
        }
        Err(e) => Ok(cx.string(format!(
            "{{\"success\":false,\"error\":\"Failed to scan directory: {}\"}}",
            e
        ))),
    }
}

// Function for getting file content
pub fn get_file_content(mut cx: FunctionContext) -> JsResult<JsString> {
    let filename = cx.argument::<JsString>(0)?.value(&mut cx);
    let uploads_dir = cx.argument::<JsString>(1)?.value(&mut cx);

    Ok(cx.string(get_file_content_impl(&filename, &uploads_dir)))
}

// Function for checking file existence
pub fn file_exists(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let filename = cx.argument::<JsString>(0)?.value(&mut cx);
    let uploads_dir = cx.argument::<JsString>(1)?.value(&mut cx);

    let file_path = format!("{}/{}", uploads_dir, filename);
    let exists = Path::new(&file_path).exists();

    Ok(cx.boolean(exists))
}

// Function for downloading file
pub fn download_file(mut cx: FunctionContext) -> JsResult<JsString> {
    let filename = cx.argument::<JsString>(0)?.value(&mut cx);
    let uploads_dir = cx.argument::<JsString>(1)?.value(&mut cx);

    Ok(cx.string(download_file_impl(&filename, &uploads_dir)))
}

// Function for registering file download route
pub fn register_download_route(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let path = cx.argument::<JsString>(0)?.value(&mut cx);
    let options_json = cx.argument::<JsString>(1)?.value(&mut cx);

    register_download_route_impl(&path, &options_json, cx)
}

// Function for registering file upload route (single or multiple)
pub fn register_upload_route(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let path = cx.argument::<JsString>(0)?.value(&mut cx);
    let options_json = cx.argument::<JsString>(1)?.value(&mut cx);

    register_upload_route_impl(&path, &options_json, cx)
}
