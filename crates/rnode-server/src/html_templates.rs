use axum::http::StatusCode;
use axum::response::Response;
use axum::body::Body;

/// Generate HTML error page
pub fn generate_error_page(status_code: StatusCode, title: &str, message: &str, details: Option<&str>, dev_mode: bool) -> Response<Body> {
    let status_text = status_code.as_str();

    let details_html = if let Some(details) = details {
        format!(r#"
            <div class="error-details">
                <details>
                    <summary>Technical Details</summary>
                    <pre>{}</pre>
                </details>
            </div>
        "#, details)
    } else {
        String::new()
    };

    let dev_info_html = if dev_mode {
        format!(r#"
            <div class="dev-info">
                <details>
                    <summary>🛠️ Stack Trace</summary>
                    <div class="dev-details">
                        <pre>{}</pre>
                    </div>
                </details>
            </div>
        "#, 
            std::backtrace::Backtrace::capture()
        )
    } else {
        String::new()
    };

    let html_content = format!(r#"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error {}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f8f9fa;
            color: #333;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            line-height: 1.5;
        }}
        
        .error-container {{
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 12px;
            padding: 32px;
            max-width: 420px;
            width: 100%;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }}
        
        .status-header {{
            margin-bottom: 20px;
        }}
        
        .status-code {{
            font-size: 2.5rem;
            font-weight: 300;
            color: #dc3545;
            line-height: 1;
            margin-bottom: 8px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
        }}
        
        .status-name {{
            font-size: 0.75rem;
            color: #6c757d;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        
        .error-title {{
            font-size: 1.25rem;
            color: #dc3545;
            margin-bottom: 12px;
            font-weight: 600;
        }}
        
        .error-message {{
            font-size: 0.9rem;
            color: #6c757d;
            margin-bottom: 24px;
            line-height: 1.4;
        }}
        
        .error-details {{
            margin-top: 20px;
            text-align: left;
        }}
        
        .error-details details {{
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e9ecef;
        }}
        
        .error-details summary {{
            padding: 12px;
            cursor: pointer;
            font-weight: 500;
            color: #495057;
            user-select: none;
            transition: background-color 0.2s;
            border-radius: 8px;
            font-size: 0.85rem;
        }}
        
        .error-details summary:hover {{
            background: #e9ecef;
        }}
        
        .error-details pre {{
            background: #f1f3f4;
            padding: 12px;
            margin: 0;
            border-radius: 0 0 8px 8px;
            overflow-x: auto;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
            font-size: 0.75rem;
            color: #495057;
            border-top: 1px solid #e9ecef;
        }}
        
        .dev-info {{
            margin-top: 20px;
            text-align: left;
        }}
        
        .dev-info details {{
            background: #fff3cd;
            border-radius: 8px;
            border: 1px solid #ffeaa7;
        }}
        
        .dev-info summary {{
            padding: 12px;
            cursor: pointer;
            font-weight: 500;
            color: #856404;
            user-select: none;
            transition: background-color 0.2s;
            border-radius: 8px;
            font-size: 0.85rem;
        }}
        
        .dev-info summary:hover {{
            background: #ffeaa7;
        }}
        
        .dev-details {{
            padding: 12px;
            background: #fffbf0;
            border-radius: 0 0 8px 8px;
            border-top: 1px solid #ffeaa7;
        }}
        
        .dev-details pre {{
            background: #f8f9fa;
            padding: 10px;
            border-radius: 6px;
            overflow-x: auto;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
            font-size: 0.7rem;
            color: #495057;
            margin: 0;
        }}
        
        .actions {{
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 24px;
        }}
        
        .btn {{
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 10px 18px;
            border-radius: 8px;
            font-weight: 500;
            text-decoration: none;
            transition: all 0.2s;
            border: none;
            cursor: pointer;
            font-size: 0.8rem;
            min-width: 80px;
        }}
        
        .btn-primary {{
            background: #007bff;
            color: white;
        }}
        
        .btn-primary:hover {{
            background: #0056b3;
            transform: translateY(-1px);
        }}
        
        .btn-secondary {{
            background: #6c757d;
            color: white;
        }}
        
        .btn-secondary:hover {{
            background: #545b62;
            transform: translateY(-1px);
        }}
        
        @media (max-width: 640px) {{
            .error-container {{
                padding: 24px;
                margin: 0;
            }}
            
            .error-title {{
                font-size: 1.1rem;
            }}
            
            .actions {{
                flex-direction: column;
                align-items: stretch;
            }}
            
            .btn {{
                width: 100%;
            }}
        }}
    </style>
</head>
<body>
    <div class="error-container">
        <div class="status-header">
            <div class="status-code">{}</div>
            <div class="status-name">{}</div>
        </div>
        <h1 class="error-title">{}</h1>
        <p class="error-message">{}</p>
        {}
        {}
        <div class="actions">
            <a href="/" class="btn btn-primary">Home</a>
            <button onclick="history.back()" class="btn btn-secondary">Back</button>
        </div>
    </div>
</body>
</html>
    "#, status_code.as_str(), status_text, status_code.canonical_reason().unwrap_or("Unknown Error"), title, message, details_html, dev_info_html);

    Response::builder()
        .status(status_code)
        .header("content-type", "text/html; charset=utf-8")
        .body(Body::from(html_content))
        .unwrap()
}

/// Generate timeout error page
pub fn generate_timeout_error_page(timeout_ms: u64, details: Option<&str>) -> Response<Body> {
    generate_error_page(
        StatusCode::REQUEST_TIMEOUT,
        &format!("Request Timeout ({}ms)", timeout_ms),
        &format!("Your request took longer than {}ms to complete. Please try again or contact support if the problem persists.", timeout_ms),
        details,
        false // Don't show stack trace by default
    )
}

/// Generate generic error page
pub fn generate_generic_error_page(message: &str, details: Option<&str>) -> Response<Body> {
    generate_error_page(
        StatusCode::INTERNAL_SERVER_ERROR,
        "Server Error",
        message,
        details,
        false // Don't show stack trace by default
    )
}

/// Generate bad request error page
pub fn generate_bad_request_page(message: &str, details: Option<&str>) -> Response<Body> {
    generate_error_page(
        StatusCode::BAD_REQUEST,
        "Bad Request",
        message,
        details,
        false // Don't show stack trace by default
    )
}
