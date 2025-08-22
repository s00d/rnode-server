use neon::prelude::*;

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

    Ok(obj)
}
