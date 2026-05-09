export const isMac =
  typeof navigator !== "undefined" && /mac/i.test(navigator.platform);

export const MOD_KEY = isMac ? "⌘" : "⊞";
export const ALT_KEY = isMac ? "⌥" : "Alt";
export const CTRL_KEY = isMac ? "⌃" : "Ctrl";
export const SHIFT_KEY = "⇧";
export const BACKSPACE_KEY = "⌫";
export const ENTER_KEY = "↵";
