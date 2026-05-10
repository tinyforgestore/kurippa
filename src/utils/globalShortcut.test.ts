import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("globalShortcut", () => {
  const originalPlatform = Object.getOwnPropertyDescriptor(
    window.navigator,
    "platform"
  );

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalPlatform) {
      Object.defineProperty(window.navigator, "platform", originalPlatform);
    }
  });

  function setPlatform(value: string) {
    Object.defineProperty(window.navigator, "platform", {
      configurable: true,
      get: () => value,
    });
  }

  it("uses Cmd+Shift+C on macOS", () => {
    setPlatform("MacIntel");
    return import("./globalShortcut").then((mod) => {
      expect(mod.GLOBAL_HOTKEY_KEYS).toEqual(["⌘", "⇧", "C"]);
      expect(mod.GLOBAL_HOTKEY_DISPLAY).toBe("⌘ ⇧ C");
    });
  });

  it("uses Ctrl+Shift+K on Windows", () => {
    setPlatform("Win32");
    return import("./globalShortcut").then((mod) => {
      expect(mod.GLOBAL_HOTKEY_KEYS).toEqual(["Ctrl", "⇧", "K"]);
      expect(mod.GLOBAL_HOTKEY_DISPLAY).toBe("Ctrl ⇧ K");
    });
  });

  it("uses Ctrl+Shift+K on Linux", () => {
    setPlatform("Linux x86_64");
    return import("./globalShortcut").then((mod) => {
      expect(mod.GLOBAL_HOTKEY_KEYS).toEqual(["Ctrl", "⇧", "K"]);
      expect(mod.GLOBAL_HOTKEY_DISPLAY).toBe("Ctrl ⇧ K");
    });
  });
});
