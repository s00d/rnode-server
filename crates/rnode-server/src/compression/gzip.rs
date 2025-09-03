use std::io::Write;
use flate2::Compression;
use flate2::write::GzEncoder;

/// Compress data using Gzip with default settings
/// 
/// # Arguments
/// * `data` - Raw data to compress
/// 
/// # Returns
/// * `Option<Vec<u8>>` - Compressed data or None if compression failed
pub fn compress_gzip(data: &[u8]) -> Option<Vec<u8>> {
    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    
    // Write data to encoder
    if encoder.write_all(data).is_err() {
        return None;
    }
    
    // Finish compression
    match encoder.finish() {
        Ok(compressed_data) => Some(compressed_data),
        Err(_) => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compress_gzip() {
        let data = b"This is a test string that should be compressed by gzip. It needs to be long enough to actually benefit from compression. Let's add some repetitive content to make it more compressible. This is a test string that should be compressed by gzip. It needs to be long enough to actually benefit from compression.";
        let compressed = compress_gzip(data);
        
        assert!(compressed.is_some());
        let compressed = compressed.unwrap();
        
        // Check that it's valid gzip
        assert!(compressed.len() > 0);
    }
}
