import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { darkTheme, lightTheme } from "@/theme.css";

// ---------------------------------------------------------------------------
// Top-level module mocks (hoisted before imports by Vitest)
// ---------------------------------------------------------------------------

const mockEmitTo = vi.fn().mockResolvedValue(undefined);
const mockUnlistenFn = vi.fn();
const mockListen = vi.fn().mockResolvedValue(mockUnlistenFn);

vi.mock("@tauri-apps/api/event", () => ({
  emitTo: (...args: unknown[]) => mockEmitTo(...args),
  listen: (...args: unknown[]) => mockListen(...args),
}));

const mockSetThemeApp = vi.fn().mockResolvedValue(undefined);
vi.mock("@tauri-apps/api/app", () => ({
  setTheme: (...args: unknown[]) => mockSetThemeApp(...args),
}));

// ---------------------------------------------------------------------------
// Import hook after mocks
// ---------------------------------------------------------------------------

import { useTheme } from "./useTheme";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    vi.clearAllMocks();
    // Restore default resolved values after clearAllMocks
    mockEmitTo.mockResolvedValue(undefined);
    mockListen.mockResolvedValue(mockUnlistenFn);
    mockSetThemeApp.mockResolvedValue(undefined);
  });

  it("defaults to dark when localStorage is empty", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("returns light when localStorage has 'light'", () => {
    localStorage.setItem("theme", "light");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
  });

  it("setTheme updates localStorage", () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setTheme("light");
    });
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("adds dark theme class to documentElement on dark theme", () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setTheme("dark");
    });
    expect(document.documentElement.classList.contains(darkTheme)).toBe(true);
    expect(document.documentElement.classList.contains(lightTheme)).toBe(false);
  });

  it("adds light theme class to documentElement on light theme", () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setTheme("light");
    });
    expect(document.documentElement.classList.contains(lightTheme)).toBe(true);
    expect(document.documentElement.classList.contains(darkTheme)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // visibilitychange → re-sync from localStorage (lines 51-54)
  // -------------------------------------------------------------------------

  it("syncs theme from localStorage when document becomes visible", async () => {
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");

    // Change localStorage externally (simulating another window updating it)
    localStorage.setItem("theme", "light");

    Object.defineProperty(document, "visibilityState", { value: "visible", writable: true, configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current.theme).toBe("light");
    expect(document.documentElement.classList.contains(lightTheme)).toBe(true);
  });

  it("does not change theme when document becomes hidden (not visible)", async () => {
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");

    localStorage.setItem("theme", "light");

    Object.defineProperty(document, "visibilityState", { value: "hidden", writable: true, configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current.theme).toBe("dark");
  });

  // -------------------------------------------------------------------------
  // emitTo broadcast on setTheme (line 36) — after hasMounted
  // -------------------------------------------------------------------------

  it("emits theme-changed to all windows when setTheme is called after first render", async () => {
    const { result } = renderHook(() => useTheme());

    // Allow first useEffect to run (marks hasMounted = true)
    await act(async () => { await Promise.resolve(); });

    await act(async () => {
      result.current.setTheme("light");
      await Promise.resolve();
    });

    expect(mockEmitTo).toHaveBeenCalledWith("*", "theme-changed", "light");
  });

  it("does not emit on initial render (hasMounted is false)", async () => {
    renderHook(() => useTheme());
    // Only the initial sync effect fires — emitTo is guarded by hasMounted
    // (hasMounted starts false, so emitTo should not be called on mount)
    expect(mockEmitTo).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Tauri setTheme (native title bar) is called on theme change
  // -------------------------------------------------------------------------

  it("calls @tauri-apps/api/app setTheme after theme change", async () => {
    const { result } = renderHook(() => useTheme());
    await act(async () => { await Promise.resolve(); });

    await act(async () => {
      result.current.setTheme("light");
      await Promise.resolve();
    });

    expect(mockSetThemeApp).toHaveBeenCalledWith("light");
  });

  // -------------------------------------------------------------------------
  // Tauri listen cleanup on unmount before promise resolves (lines 69-73)
  // -------------------------------------------------------------------------

  it("calls unlisten immediately if component unmounts before listen resolves", async () => {
    const mockUnlisten = vi.fn();
    let resolveListenPromise!: (v: () => void) => void;
    const pendingListen = new Promise<() => void>((resolve) => {
      resolveListenPromise = resolve;
    });

    mockListen.mockReturnValue(pendingListen);

    const { unmount } = renderHook(() => useTheme());

    // Unmount before listen resolves
    unmount();

    // Now resolve — the .then() callback checks isMounted and should call fn() immediately
    await act(async () => {
      resolveListenPromise(mockUnlisten);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockUnlisten).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Tauri event listener — handles theme-changed event from other windows
  // -------------------------------------------------------------------------

  it("listen is registered for 'theme-changed' event on mount", async () => {
    renderHook(() => useTheme());
    await act(async () => { await Promise.resolve(); });
    expect(mockListen).toHaveBeenCalledWith("theme-changed", expect.any(Function));
  });

  it("unlisten is called on unmount", async () => {
    const { unmount } = renderHook(() => useTheme());
    await act(async () => { await Promise.resolve(); });
    unmount();
    expect(mockUnlistenFn).toHaveBeenCalled();
  });
});
