use std::time::{SystemTime, UNIX_EPOCH};

pub fn unix_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "macos")]
pub use macos::*;
#[cfg(target_os = "windows")]
pub use windows::*;

/// Frontmost source application identifier, when available.
/// macOS returns the bundle id; other platforms return None.
pub fn source_app() -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        frontmost_app_bundle_id()
    }
    #[cfg(not(target_os = "macos"))]
    {
        None
    }
}

/// Returns (rtf, html) from the clipboard. macOS only — other platforms return (None, None).
pub fn read_rtf_html() -> (Option<String>, Option<String>) {
    #[cfg(target_os = "macos")]
    {
        (read_rtf_macos(), read_html_macos())
    }
    #[cfg(not(target_os = "macos"))]
    {
        (None, None)
    }
}

/// Capture all raw clipboard formats for faithful multi-format paste.
pub fn read_raw_formats() -> Vec<(String, Vec<u8>)> {
    #[cfg(target_os = "macos")]
    {
        read_all_formats_macos()
    }
    #[cfg(target_os = "windows")]
    {
        read_all_formats_windows()
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Vec::new()
    }
}
