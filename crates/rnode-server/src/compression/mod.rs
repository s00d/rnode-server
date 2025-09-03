//! Compression module for RNode Server
//!
//! This module provides various compression algorithms for static files and data.
//! It includes Gzip, Brotli, Zstandard, and LZ4 compression methods.

pub mod gzip;
pub mod brotli;
pub mod zstd;
pub mod lz4;

// Re-export public functions for backward compatibility
pub use gzip::compress_gzip;
pub use brotli::compress_brotli;
pub use zstd::compress_zstd;
pub use lz4::compress_lz4;
