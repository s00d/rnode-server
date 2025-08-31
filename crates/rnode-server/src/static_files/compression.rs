// Function for Gzip compression
pub fn compress_gzip(data: &[u8]) -> Option<Vec<u8>> {
    use flate2::Compression;
    use flate2::write::GzEncoder;
    use std::io::Write;

    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    if encoder.write_all(data).is_ok() {
        encoder.finish().ok()
    } else {
        None
    }
}

// Function for Brotli compression
pub fn compress_brotli(data: &[u8]) -> Option<Vec<u8>> {
    use brotli::BrotliCompress;
    use brotli::enc::BrotliEncoderParams;
    use std::io::Cursor;

    let mut params = BrotliEncoderParams::default();
    params.quality = 11; // Maximum quality

    let mut output = Vec::new();
    let mut input = Cursor::new(data);
    if BrotliCompress(&mut input, &mut output, &params).is_ok() {
        Some(output)
    } else {
        None
    }
}
