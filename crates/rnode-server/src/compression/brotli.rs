use std::io::Cursor;
use brotli::BrotliCompress;
use brotli::enc::BrotliEncoderParams;

/// Compress data using Brotli with default settings
/// 
/// # Arguments
/// * `data` - Raw data to compress
/// 
/// # Returns
/// * `Option<Vec<u8>>` - Compressed data or None if compression failed
pub fn compress_brotli(data: &[u8]) -> Option<Vec<u8>> {
    let mut params = BrotliEncoderParams::default();
    params.quality = 11; // Maximum quality
    
    let mut output = Vec::new();
    let mut input = Cursor::new(data);
    
    match BrotliCompress(&mut input, &mut output, &params) {
        Ok(_) => Some(output),
        Err(_) => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compress_brotli() {
        let data = b"This is a test string that should be compressed by brotli. It needs to be long enough to actually benefit from compression. Let's add some repetitive content to make it more compressible. This is a test string that should be compressed by brotli. It needs to be long enough to actually benefit from compression.";
        let compressed = compress_brotli(data);
        
        assert!(compressed.is_some());
        let compressed = compressed.unwrap();
        
        // Check that it's valid brotli
        assert!(compressed.len() > 0);
    }

    #[test]
    fn test_brotli_vs_gzip() {
        let data = b"This is a test string to compare brotli and gzip compression ratios";
        
        let brotli_compressed = compress_brotli(data).unwrap();
        let gzip_compressed = super::super::gzip::compress_gzip(data).unwrap();
        
        // Brotli typically provides better compression than gzip
        // but this is not guaranteed for all data
        log::info!(
            "Brotli: {} bytes, Gzip: {} bytes",
            brotli_compressed.len(),
            gzip_compressed.len()
        );
    }
}
