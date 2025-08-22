use neon::prelude::*;

// Импортируем модули
mod types;
mod static_files;
mod middleware;
mod routes;
mod handlers;
mod utils;
mod server;

// Реэкспортируем публичные функции из модулей
use static_files::load_static_files;
use middleware::register_middleware;
use routes::*;
use handlers::process_http_request;
use utils::*;
use server::start_listen;

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
    cx.export_function("use", register_middleware)?;
    cx.export_function("listen", start_listen)?;
    cx.export_function("processHttpRequest", process_http_request)?;
    cx.export_function("loadStaticFiles", load_static_files)?;
    Ok(())
}
