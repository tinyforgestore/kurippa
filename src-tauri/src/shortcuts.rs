use tauri_plugin_global_shortcut::{Code, Modifiers};

#[cfg(target_os = "macos")]
pub const TOGGLE_MODS: Modifiers = Modifiers::META.union(Modifiers::SHIFT);
#[cfg(target_os = "macos")]
pub const TOGGLE_KEY: Code = Code::KeyC;

#[cfg(not(target_os = "macos"))]
pub const TOGGLE_MODS: Modifiers = Modifiers::SUPER.union(Modifiers::SHIFT);
#[cfg(not(target_os = "macos"))]
pub const TOGGLE_KEY: Code = Code::KeyV;
