import { isMac, SHIFT_KEY } from "./platformKeys";

// Must match src-tauri/src/shortcuts.rs (TOGGLE_MODS / TOGGLE_KEY).
export const GLOBAL_HOTKEY_KEYS: string[] = isMac
  ? ["⌘", SHIFT_KEY, "C"]
  : ["Ctrl", SHIFT_KEY, "K"];

export const GLOBAL_HOTKEY_DISPLAY = GLOBAL_HOTKEY_KEYS.join(" ");
