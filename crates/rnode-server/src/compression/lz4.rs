use lz4::block::compress;

/// Compress data using LZ4 with default settings
/// 
/// # Arguments
/// * `data` - Raw data to compress
/// 
/// # Returns
/// * `Option<Vec<u8>>` - Compressed data or None if compression failed
pub fn compress_lz4(data: &[u8]) -> Option<Vec<u8>> {
    match compress(data, None, false) {
        Ok(compressed_data) => Some(compressed_data),
        Err(_) => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compress_lz4() {
        let data = b"This is a test string that should be compressed by lz4. It needs to be long enough to actually benefit from compression. Let's add some repetitive content to make it more compressible. This is a test string that should be compressed by lz4. It needs to be long enough to actually benefit from compression.";
        let compressed = compress_lz4(data);
        
        assert!(compressed.is_some());
        let compressed = compressed.unwrap();
        
        // Check that it's valid lz4 (compressed data should be smaller or at least different)
        assert!(compressed.len() > 0);
        assert!(compressed != data);
    }

    #[test]
    fn test_lz4_vs_gzip() {
        let data = b"This is a test string to compare lz4 and gzip compression ratios";
        
        let lz4_compressed = compress_lz4(data).unwrap();
        let gzip_compressed = super::super::gzip::compress_gzip(data).unwrap();
        
        // LZ4 is typically faster but may not compress as well as gzip
        // for text data
        log::info!(
            "LZ4: {} bytes, Gzip: {} bytes",
            lz4_compressed.len(),
            gzip_compressed.len()
        );
    }

    #[test]
    fn test_lz4_speed() {
        let data = b"This is a test string to measure lz4 compression speed. It needs to be long enough to actually benefit from compression. Let's add some repetitive content to make it more compressible. This is a test string to measure lz4 compression speed. It needs to be long enough to actually benefit from compression.";
        
        let start = std::time::Instant::now();
        let compressed = compress_lz4(data);
        let duration = start.elapsed();
        
        assert!(compressed.is_some());
        log::info!("LZ4 compression took: {:?}", duration);
    }
}
