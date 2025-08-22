use neon::prelude::*;

// Импортируем модули
mod file_operations;
mod handlers;
mod middleware;
mod routes;
mod server;
mod static_files;
mod types;
mod utils;

// Реэкспортируем публичные функции из модулей
use file_operations::{
    delete_file, download_file, file_exists, get_file_content, list_files, register_download_route,
    register_upload_route, save_file,
};
use handlers::process_http_request;
use middleware::register_middleware;
use routes::*;
use server::start_listen;
use static_files::{clear_static_cache, get_static_stats, load_static_files};
use utils::*;

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    // Экспортируем основные функции
    cx.export_function("hello", hello_wrapper)?;
    cx.export_function("createApp", create_app)?;
    cx.export_function("get", register_get)?;
    cx.export_function("post", register_post)?;
    cx.export_function("put", register_put)?;
    cx.export_function("del", register_delete)?;
    cx.export_function("patch", register_patch)?;
    cx.export_function("options", register_options)?;
    cx.export_function("use", register_middleware)?;
    cx.export_function("listen", start_listen)?;
    cx.export_function("processHttpRequest", process_http_request)?;
    cx.export_function("loadStaticFiles", load_static_files)?;
    cx.export_function("clearStaticCache", clear_static_cache)?;
    cx.export_function("getStaticStats", get_static_stats)?;

    // Экспортируем функции для работы с файлами
    cx.export_function("saveFile", save_file)?;
    cx.export_function("deleteFile", delete_file)?;
    cx.export_function("listFiles", list_files)?;
    cx.export_function("getFileContent", get_file_content)?;
    cx.export_function("fileExists", file_exists)?;
    cx.export_function("downloadFile", download_file)?;
    cx.export_function("registerDownloadRoute", register_download_route)?;
    cx.export_function("registerUploadRoute", register_upload_route)?;

    Ok(())
}
