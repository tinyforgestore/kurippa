export const isMac =
  typeof navigator !== "undefined" && /mac/i.test(navigator.platform);

/**
 * In-app shortcut modifier (Cmd on macOS, Ctrl elsewhere).
 * The global open-Kurippa hotkey lives in src/utils/globalShortcut.ts.
 */
export const MOD_KEY = isMac ? "⌘" : "Ctrl";
export const ALT_KEY = isMac ? "⌥" : "Alt";
export const CTRL_KEY = isMac ? "⌃" : "Ctrl";
export const SHIFT_KEY = "⇧";
export const BACKSPACE_KEY = isMac ? "⌫" : "Backspace";
export const ENTER_KEY = "↵";

export function combo(...keys: string[]): string {
  return isMac ? keys.join("") : keys.join("+");
}
