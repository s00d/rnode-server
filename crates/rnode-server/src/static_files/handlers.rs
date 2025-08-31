use log::debug;
use super::types::StaticFile;

// Function for building response with static file
pub fn build_static_response(
    static_file: &StaticFile,
    accept_encoding: Option<&str>,
    _file_path: &str,
) -> Option<axum::response::Response<axum::body::Body>> {
    use axum::body::Body;
    use axum::http::StatusCode;
    use axum::response::Response;

    debug!(
        "🔧 Building response for file: {} bytes, MIME: {}",
        static_file.size, static_file.mime_type
    );

    // Determine content and compression headers
    let (content, content_encoding) = if let Some(accept_enc) = accept_encoding {
        if accept_enc.contains("br") && static_file.brotli_content.is_some() {
            let compressed = static_file.brotli_content.as_ref().unwrap();
            debug!(
                "🗜️  Using Brotli compressed content: {} -> {} bytes",
                static_file.size,
                compressed.len()
            );
            (compressed, "br")
        } else if accept_enc.contains("gzip") && static_file.gzip_content.is_some() {
            let compressed = static_file.gzip_content.as_ref().unwrap();
            debug!(
                "🗜️  Using Gzip compressed content: {} -> {} bytes",
                static_file.size,
                compressed.len()
            );
            (compressed, "gzip")
        } else {
            debug!(
                "📄 Using uncompressed content: {} bytes",
                static_file.content.len()
            );
            (&static_file.content, "")
        }
    } else {
        debug!(
            "📄 No accept-encoding, using uncompressed content: {} bytes",
            static_file.content.len()
        );
        (&static_file.content, "")
    };

    let mut response_builder = Response::builder().status(StatusCode::OK);

    // Use ready Content-Type header
    response_builder = response_builder.header("content-type", &static_file.content_type_header);
    debug!(
        "📄 Content-Type: {} (cached)",
        static_file.content_type_header
    );

    // Add Content-Length only for uncompressed content
    if content_encoding.is_empty() {
        response_builder = response_builder.header("content-length", content.len().to_string());
        debug!("📏 Added content-length header: {} bytes", content.len());
    } else {
        debug!(
            "📏 Skipping content-length for compressed content ({} -> {} bytes)",
            static_file.size,
            content.len()
        );
    }

    // Add ready headers from cache
    response_builder = response_builder
        .header("cache-control", &static_file.headers.cache_control)
        .header("etag", &static_file.headers.etag)
        .header("last-modified", &static_file.headers.last_modified);

    debug!(
        "🏷️  Added cached headers: ETag={}, Last-Modified={}, Cache-Control={}",
        static_file.headers.etag,
        static_file.headers.last_modified,
        static_file.headers.cache_control
    );

    if !content_encoding.is_empty() {
        response_builder = response_builder.header("content-encoding", content_encoding);
        debug!("🗜️  Added content-encoding header: {}", content_encoding);
    }

    debug!("✅ Response built successfully for {} bytes", content.len());
    response_builder.body(Body::from(content.clone())).ok()
}


