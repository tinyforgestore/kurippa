//! Event names emitted to the WebView via `app.emit`. Must stay in sync with
//! `src/constants/events.ts`.

pub const CLIPBOARD_UPDATED: &str = "clipboard-updated";
pub const HISTORY_CLEARED: &str = "history-cleared";
pub const LICENSE_STATE_CHANGED: &str = "license-state-changed";
pub const UPDATE_AVAILABLE: &str = "update-available";

/// Emitted when the macOS panel resigns key (focus lost) so the frontend can
/// reset transient UI state. Must stay in sync with `src/constants/events.ts`.
pub const PANEL_DISMISSED: &str = "panel-dismissed";
