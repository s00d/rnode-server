use neon::prelude::*;

// Простая функция приветствия
pub fn hello_wrapper(mut cx: FunctionContext) -> JsResult<JsString> {
    let name = cx.argument::<JsString>(0)?.value(&mut cx);
    let message = format!("Hello {} from RNode Server!", name);
    Ok(cx.string(message))
}

// Функция для создания простого объекта приложения
pub fn create_app(mut cx: FunctionContext) -> JsResult<JsObject> {
    let obj = cx.empty_object();

    // Добавляем простую информацию о приложении
    let app_name = cx.string("RNode Express Server");
    obj.set(&mut cx, "name", app_name)?;

    let version = cx.string("0.1.0");
    obj.set(&mut cx, "version", version)?;

    Ok(obj)
}
