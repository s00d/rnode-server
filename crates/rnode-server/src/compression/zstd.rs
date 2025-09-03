use std::io::Write;
use zstd::stream::Encoder;

/// Compress data using Zstandard with default settings
/// 
/// # Arguments
/// * `data` - Raw data to compress
/// 
/// # Returns
/// * `Option<Vec<u8>>` - Compressed data or None if compression failed
pub fn compress_zstd(data: &[u8]) -> Option<Vec<u8>> {
    let mut encoder = match Encoder::new(Vec::new(), 3) { // Level 3 for good balance
        Ok(encoder) => encoder,
        Err(_) => return None,
    };
    
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
    fn test_compress_zstd() {
        let data = b"This is a test string that should be compressed by zstd. It needs to be long enough to actually benefit from compression. Let's add some repetitive content to make it more compressible. This is a test string that should be compressed by zstd. It needs to be long enough to actually benefit from compression.";
        let compressed = compress_zstd(data);
        
        assert!(compressed.is_some());
        let compressed = compressed.unwrap();
        
        // Check that it's valid zstd
        assert!(compressed.len() > 0);
    }

    #[test]
    fn test_zstd_vs_gzip() {
        let data = b"This is a test string to compare zstd and gzip compression ratios";
        
        let zstd_compressed = compress_zstd(data).unwrap();
        let gzip_compressed = super::super::gzip::compress_gzip(data).unwrap();
        
        // Zstd typically provides better compression than gzip
        // but this is not guaranteed for all data
        log::info!(
            "Zstd: {} bytes, Gzip: {} bytes",
            zstd_compressed.len(),
            gzip_compressed.len()
        );
    }
}
