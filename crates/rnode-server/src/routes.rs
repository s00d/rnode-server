use crate::types::{RouteInfo, get_routes};
use neon::prelude::*;

// Universal function for route registration
fn register_route(method: &str) -> impl Fn(FunctionContext) -> JsResult<JsUndefined> + '_ {
    move |mut cx: FunctionContext| {
        let path = cx.argument::<JsString>(0)?.value(&mut cx);
        let _handler = cx.argument::<JsFunction>(1)?; // JS handler function

        println!("Registering {} route: {}", method, path);

        // Just store route information without executing the handler
        let _response_content = format!("Route registered: {} {}", method, path);

        // Generate unique handler ID
        let handler_id = format!(
            "{}_{}_{}",
            method,
            path.replace('/', "_"),
            std::process::id()
        );

        // Add route to global storage (synchronously)
        let routes = get_routes();

        {
            let mut routes_map = routes.write().unwrap();

            let route_info = RouteInfo {
                path: path.clone(),
                method: method.to_string(),
                handler_id: handler_id.clone(),
            };

            routes_map.insert(format!("{}:{}", method, path), route_info);
        }

        println!("Stored route info for {} {}", method, path);

        Ok(cx.undefined())
    }
}

// Wrapper functions for all HTTP methods
pub fn register_get(cx: FunctionContext) -> JsResult<JsUndefined> {
    register_route("GET")(cx)
}

pub fn register_post(cx: FunctionContext) -> JsResult<JsUndefined> {
    register_route("POST")(cx)
}

pub fn register_put(cx: FunctionContext) -> JsResult<JsUndefined> {
    register_route("PUT")(cx)
}

pub fn register_delete(cx: FunctionContext) -> JsResult<JsUndefined> {
    register_route("DELETE")(cx)
}

pub fn register_patch(cx: FunctionContext) -> JsResult<JsUndefined> {
    register_route("PATCH")(cx)
}

pub fn register_options(cx: FunctionContext) -> JsResult<JsUndefined> {
    register_route("OPTIONS")(cx)
}
