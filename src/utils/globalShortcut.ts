import { isMac, SHIFT_KEY } from "./platformKeys";

// Must match src-tauri/src/shortcuts.rs (TOGGLE_MODS / TOGGLE_KEY).
export const GLOBAL_HOTKEY_KEYS: readonly string[] = isMac
  ? (["⌘", SHIFT_KEY, "C"] as const)
  : (["Ctrl", SHIFT_KEY, "K"] as const);

export const GLOBAL_HOTKEY_DISPLAY = GLOBAL_HOTKEY_KEYS.join(" ");
