import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("platformKeys", () => {
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

  it("uses macOS glyphs when navigator.platform is MacIntel", () => {
    setPlatform("MacIntel");
    return import("./platformKeys").then((mod) => {
      expect(mod.isMac).toBe(true);
      expect(mod.MOD_KEY).toBe("⌘");
      expect(mod.ALT_KEY).toBe("⌥");
      expect(mod.CTRL_KEY).toBe("⌃");
      expect(mod.SHIFT_KEY).toBe("⇧");
      expect(mod.BACKSPACE_KEY).toBe("⌫");
      expect(mod.ENTER_KEY).toBe("↵");
    });
  });

  it("uses Windows glyphs when navigator.platform is Win32", () => {
    setPlatform("Win32");
    return import("./platformKeys").then((mod) => {
      expect(mod.isMac).toBe(false);
      expect(mod.MOD_KEY).toBe("Win");
      expect(mod.ALT_KEY).toBe("Alt");
      expect(mod.CTRL_KEY).toBe("Ctrl");
      expect(mod.SHIFT_KEY).toBe("⇧");
    });
  });

  it("uses non-mac glyphs when navigator.platform is Linux x86_64", () => {
    setPlatform("Linux x86_64");
    return import("./platformKeys").then((mod) => {
      expect(mod.isMac).toBe(false);
      expect(mod.MOD_KEY).toBe("Win");
      expect(mod.ALT_KEY).toBe("Alt");
      expect(mod.CTRL_KEY).toBe("Ctrl");
    });
  });
});
