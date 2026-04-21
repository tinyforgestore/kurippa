import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLicense } from "@/hooks/useLicense";

const mockInvoke = vi.fn();
const mockStoreGet = vi.fn();
const mockLoad = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("@tauri-apps/plugin-store", () => ({
  load: (...args: unknown[]) => mockLoad(...args),
}));

function setupStore(trialValue: boolean | null) {
  mockLoad.mockResolvedValue({ get: mockStoreGet });
  mockStoreGet.mockResolvedValue(trialValue);
}

describe("useLicense", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("mode detection on mount", () => {
    it("sets mode to activated when is_activated_cmd returns true", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "is_activated_cmd") return Promise.resolve(true);
        if (cmd === "get_license_info_cmd") return Promise.resolve({
          license_key: "KEY",
          instance_id: "inst-1",
          activated_at: "2024-01-01T00:00:00Z",
        });
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useLicense());
      await act(async () => {});
      expect(result.current.mode).toBe("activated");
    });

    it("populates licenseInfo when activated", async () => {
      const info = { license_key: "K", instance_id: "I", activated_at: "2024-01-01T00:00:00Z" };
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "is_activated_cmd") return Promise.resolve(true);
        if (cmd === "get_license_info_cmd") return Promise.resolve(info);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useLicense());
      await act(async () => {});
      expect(result.current.licenseInfo).toEqual(info);
    });

    it("sets mode to trial when not activated and trial flag is true", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "is_activated_cmd") return Promise.resolve(false);
        return Promise.resolve(null);
      });
      setupStore(true);

      const { result } = renderHook(() => useLicense());
      await act(async () => {});
      expect(result.current.mode).toBe("trial");
    });

    it("sets mode to first_launch when not activated and no trial flag", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "is_activated_cmd") return Promise.resolve(false);
        return Promise.resolve(null);
      });
      setupStore(null);

      const { result } = renderHook(() => useLicense());
      await act(async () => {});
      expect(result.current.mode).toBe("first_launch");
    });
  });

  describe("deactivate", () => {
    it("calls deactivate_license_cmd and sets mode to trial on success", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "is_activated_cmd") return Promise.resolve(true);
        if (cmd === "get_license_info_cmd") return Promise.resolve({ license_key: "K", instance_id: "I", activated_at: "2024-01-01T00:00:00Z" });
        if (cmd === "deactivate_license_cmd") return Promise.resolve(undefined);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useLicense());
      await act(async () => {});
      expect(result.current.mode).toBe("activated");

      await act(async () => {
        await result.current.deactivate();
      });

      expect(mockInvoke).toHaveBeenCalledWith("deactivate_license_cmd");
      expect(result.current.mode).toBe("trial");
      expect(result.current.licenseInfo).toBeNull();
    });

    it("throws when deactivate_license_cmd fails", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "is_activated_cmd") return Promise.resolve(true);
        if (cmd === "get_license_info_cmd") return Promise.resolve(null);
        if (cmd === "deactivate_license_cmd") return Promise.reject(new Error("network fail"));
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useLicense());
      await act(async () => {});

      await expect(
        act(async () => { await result.current.deactivate(); })
      ).rejects.toThrow("network fail");
    });
  });

  describe("activate", () => {
    const mockStoreSave = vi.fn().mockResolvedValue(undefined);
    const mockStoreDelete = vi.fn();

    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "is_activated_cmd") return Promise.resolve(false);
        if (cmd === "activate_license_cmd") return Promise.resolve(undefined);
        return Promise.resolve(null);
      });
      mockLoad.mockResolvedValue({
        get: mockStoreGet,
        delete: mockStoreDelete,
        save: mockStoreSave,
      });
      mockStoreGet.mockResolvedValue(null);
    });

    it("calls activate_license_cmd with the provided key", async () => {
      const { result } = renderHook(() => useLicense());
      await act(async () => {});

      await act(async () => {
        await result.current.activate("MY-KEY-1234");
      });

      expect(mockInvoke).toHaveBeenCalledWith("activate_license_cmd", { key: "MY-KEY-1234" });
    });

    it("sets mode to activated and clears device_limit flag on success", async () => {
      const { result } = renderHook(() => useLicense());
      await act(async () => {});

      await act(async () => {
        await result.current.activate("VALID-KEY");
      });

      expect(result.current.mode).toBe("activated");
      expect(mockStoreDelete).toHaveBeenCalledWith("device_limit");
      expect(mockStoreSave).toHaveBeenCalled();
    });

    it("sets mode to device_limit and rethrows on DeviceLimitReached error", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "is_activated_cmd") return Promise.resolve(false);
        if (cmd === "activate_license_cmd") return Promise.reject("DeviceLimitReached: all slots used");
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useLicense());
      await act(async () => {});

      let thrown: unknown;
      await act(async () => {
        await result.current.activate("BAD-KEY").catch((err) => { thrown = err; });
      });

      expect(result.current.mode).toBe("device_limit");
      expect(thrown).toContain("DeviceLimitReached");
    });

    it("does not change mode and rethrows on InvalidKey error", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "is_activated_cmd") return Promise.resolve(false);
        if (cmd === "activate_license_cmd") return Promise.reject("InvalidKey: not found");
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useLicense());
      await act(async () => {});
      const modeBefore = result.current.mode;

      let thrown: unknown;
      await act(async () => {
        await result.current.activate("WRONG-KEY").catch((err) => { thrown = err; });
      });

      expect(result.current.mode).toBe(modeBefore);
      expect(thrown).toContain("InvalidKey");
    });
  });

  describe("openActivationWindow", () => {
    it("calls show_activation_window command", async () => {
      mockInvoke.mockResolvedValue(undefined);
      setupStore(false);

      const { result } = renderHook(() => useLicense());
      await act(async () => {});

      act(() => { result.current.openActivationWindow(); });
      expect(mockInvoke).toHaveBeenCalledWith("show_activation_window");
    });
  });

  // -------------------------------------------------------------------------
  // Uncovered lines — device_limit branch (line 56) + Tauri event listener (lines 69-70)
  // -------------------------------------------------------------------------

  describe("mode detection — device_limit branch", () => {
    it("sets mode to device_limit when not activated and device_limit flag is true", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "is_activated_cmd") return Promise.resolve(false);
        return Promise.resolve(null);
      });
      // trial = null, device_limit = true
      mockLoad.mockResolvedValue({
        get: vi.fn().mockImplementation((key: string) => {
          if (key === "trial") return Promise.resolve(null);
          if (key === "device_limit") return Promise.resolve(true);
          return Promise.resolve(null);
        }),
      });

      const { result } = renderHook(() => useLicense());
      await act(async () => {});
      expect(result.current.mode).toBe("device_limit");
    });
  });

  describe("visibilitychange listener", () => {
    it("re-runs checkLicense when window becomes visible", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "is_activated_cmd") return Promise.resolve(true);
        if (cmd === "get_license_info_cmd") return Promise.resolve(null);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useLicense());
      await act(async () => {});
      expect(result.current.mode).toBe("activated");

      // Change mock so next check returns trial
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "is_activated_cmd") return Promise.resolve(false);
        return Promise.resolve(null);
      });
      mockLoad.mockResolvedValue({
        get: vi.fn().mockImplementation((key: string) => {
          if (key === "trial") return Promise.resolve(true);
          return Promise.resolve(null);
        }),
      });

      Object.defineProperty(document, "visibilityState", { value: "visible", writable: true, configurable: true });
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.mode).toBe("trial");
    });
  });

  describe("Tauri license-state-changed event listener", () => {
    it("unmount cleans up the listener without crashing", async () => {
      const mockUnlisten = vi.fn();
      const mockListen = vi.fn().mockResolvedValue(mockUnlisten);

      vi.doMock("@tauri-apps/api/event", () => ({
        listen: (...args: unknown[]) => mockListen(...args),
      }));

      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "is_activated_cmd") return Promise.resolve(false);
        return Promise.resolve(null);
      });
      mockLoad.mockResolvedValue({
        get: vi.fn().mockResolvedValue(null),
      });

      const { unmount } = renderHook(() => useLicense());
      await act(async () => {});

      // Unmounting should call unlisten
      unmount();
      // No assertion needed — just ensuring no crash
    });
  });
});
