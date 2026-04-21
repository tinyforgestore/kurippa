import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSettings } from "@/hooks/useSettings";
import type { AppSettings } from "@/types/settings";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

const DEFAULT_SETTINGS: AppSettings = {
  history_limit: "h500",
  auto_clear_after: "off",
  multi_paste_separator: "newline",
  launch_at_login: false,
  auto_clear_passwords: false,
  ignored_apps: [],
};

const SETTINGS_WITH_APP: AppSettings = {
  ...DEFAULT_SETTINGS,
  ignored_apps: [{ bundle_id: "com.example.App", display_name: "Example App" }],
};

describe("useSettings", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue(DEFAULT_SETTINGS);
  });

  async function setup() {
    const hook = renderHook(() => useSettings());
    await act(async () => {});
    return hook;
  }

  describe("initial load", () => {
    it("calls invoke('get_settings') on mount", async () => {
      await setup();
      expect(mockInvoke).toHaveBeenCalledWith("get_settings");
    });

    it("populates settings state from get_settings result", async () => {
      const { result } = await setup();
      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    });

    it("settings is null before load completes", () => {
      mockInvoke.mockReturnValue(new Promise(() => {})); // never resolves
      const { result } = renderHook(() => useSettings());
      expect(result.current.settings).toBeNull();
    });
  });

  describe("updateSettings", () => {
    it("merges the patch into current settings", async () => {
      const { result } = await setup();

      await act(async () => {
        result.current.updateSettings({ history_limit: "h1000" });
      });

      expect(result.current.settings?.history_limit).toBe("h1000");
      // Other fields preserved
      expect(result.current.settings?.auto_clear_after).toBe("off");
    });

    it("calls invoke('save_settings') with the merged settings", async () => {
      const { result } = await setup();
      mockInvoke.mockClear();
      mockInvoke.mockResolvedValue(undefined);

      await act(async () => {
        result.current.updateSettings({ auto_clear_after: "days30" });
      });

      expect(mockInvoke).toHaveBeenCalledWith("save_settings", {
        s: { ...DEFAULT_SETTINGS, auto_clear_after: "days30" },
      });
    });

    it("is a no-op when settings is null", async () => {
      mockInvoke.mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        result.current.updateSettings({ history_limit: "h100" });
      });

      expect(result.current.settings).toBeNull();
    });
  });

  describe("setLaunchAtLogin", () => {
    it("calls invoke('set_launch_at_login') with enabled flag", async () => {
      const { result } = await setup();
      mockInvoke.mockClear();
      mockInvoke.mockResolvedValue(undefined);

      await act(async () => {
        result.current.setLaunchAtLogin(true);
      });

      expect(mockInvoke).toHaveBeenCalledWith("set_launch_at_login", { enabled: true });
    });

    it("updates launch_at_login in local settings state", async () => {
      const { result } = await setup();

      await act(async () => {
        result.current.setLaunchAtLogin(true);
      });

      expect(result.current.settings?.launch_at_login).toBe(true);
    });

    it("can toggle back to false", async () => {
      mockInvoke.mockResolvedValue({ ...DEFAULT_SETTINGS, launch_at_login: true });
      const { result } = await setup();

      await act(async () => {
        result.current.setLaunchAtLogin(false);
      });

      expect(result.current.settings?.launch_at_login).toBe(false);
    });
  });

  describe("addIgnoredApp", () => {
    it("calls invoke('pick_app_bundle') to select an app", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_settings") return Promise.resolve(DEFAULT_SETTINGS);
        if (cmd === "pick_app_bundle") return Promise.resolve(null);
        return Promise.resolve(undefined);
      });
      const { result } = await setup();
      mockInvoke.mockClear();
      mockInvoke.mockResolvedValue(null);

      await act(async () => {
        result.current.addIgnoredApp();
        await Promise.resolve();
      });

      expect(mockInvoke).toHaveBeenCalledWith("pick_app_bundle");
    });

    it("appends the selected app to ignored_apps", async () => {
      const newApp = { bundle_id: "com.new.App", display_name: "New App" };
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_settings") return Promise.resolve(DEFAULT_SETTINGS);
        if (cmd === "pick_app_bundle") return Promise.resolve(newApp);
        return Promise.resolve(undefined);
      });
      const { result } = await setup();

      await act(async () => {
        result.current.addIgnoredApp();
        await Promise.resolve();
      });

      expect(result.current.settings?.ignored_apps).toContainEqual(newApp);
    });

    it("does not add a duplicate app", async () => {
      const existingApp = { bundle_id: "com.example.App", display_name: "Example App" };
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_settings")
          return Promise.resolve({ ...DEFAULT_SETTINGS, ignored_apps: [existingApp] });
        if (cmd === "pick_app_bundle") return Promise.resolve(existingApp);
        return Promise.resolve(undefined);
      });
      const { result } = await setup();

      await act(async () => {
        result.current.addIgnoredApp();
        await Promise.resolve();
      });

      expect(result.current.settings?.ignored_apps).toHaveLength(1);
    });

    it("is a no-op when pick_app_bundle returns null", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_settings") return Promise.resolve(DEFAULT_SETTINGS);
        if (cmd === "pick_app_bundle") return Promise.resolve(null);
        return Promise.resolve(undefined);
      });
      const { result } = await setup();

      await act(async () => {
        result.current.addIgnoredApp();
        await Promise.resolve();
      });

      expect(result.current.settings?.ignored_apps).toHaveLength(0);
    });
  });

  describe("removeIgnoredApp", () => {
    it("removes the app with the matching bundleId", async () => {
      mockInvoke.mockResolvedValue(SETTINGS_WITH_APP);
      const { result } = await setup();
      mockInvoke.mockClear();
      mockInvoke.mockResolvedValue(undefined);

      await act(async () => {
        result.current.removeIgnoredApp("com.example.App");
      });

      expect(result.current.settings?.ignored_apps).toHaveLength(0);
    });

    it("calls invoke('save_settings') after removal", async () => {
      mockInvoke.mockResolvedValue(SETTINGS_WITH_APP);
      const { result } = await setup();
      mockInvoke.mockClear();
      mockInvoke.mockResolvedValue(undefined);

      await act(async () => {
        result.current.removeIgnoredApp("com.example.App");
      });

      expect(mockInvoke).toHaveBeenCalledWith("save_settings", {
        s: { ...SETTINGS_WITH_APP, ignored_apps: [] },
      });
    });

    it("is a no-op when bundleId does not match any app", async () => {
      mockInvoke.mockResolvedValue(SETTINGS_WITH_APP);
      const { result } = await setup();

      await act(async () => {
        result.current.removeIgnoredApp("com.nonexistent.App");
      });

      expect(result.current.settings?.ignored_apps).toHaveLength(1);
    });
  });
});
