// Event names received from the Rust backend via @tauri-apps/api/event listen.
// Must stay in sync with src-tauri/src/events.rs.

export const CLIPBOARD_UPDATED = "clipboard-updated";
export const HISTORY_CLEARED = "history-cleared";
export const LICENSE_STATE_CHANGED = "license-state-changed";
export const UPDATE_AVAILABLE = "update-available";

// Emitted when the macOS panel resigns key (focus lost) so the frontend can
// reset transient UI state. Must stay in sync with src-tauri/src/events.rs.
export const PANEL_DISMISSED = "panel-dismissed";
