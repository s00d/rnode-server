//! Template engine module for RNode Server
//! 
//! This module provides template rendering capabilities using the Tera template engine.
//! It includes initialization, rendering, and JavaScript bindings.

pub mod engine;
pub mod neon_wrappers;
pub mod context;

// Re-export public functions for backward compatibility
pub use neon_wrappers::{init_templates_wrapper, render_template_wrapper};
