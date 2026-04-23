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

import { useTheme, getEffectiveTheme } from "./useTheme";

// ---------------------------------------------------------------------------
// matchMedia mock helpers
// ---------------------------------------------------------------------------

type MatchMediaListener = (e: MediaQueryListEvent) => void;

function mockMatchMedia(prefersDark: boolean) {
  const listeners: MatchMediaListener[] = [];
  const mql = {
    matches: prefersDark,
    addEventListener: vi.fn((_: string, fn: MatchMediaListener) => listeners.push(fn)),
    removeEventListener: vi.fn((_: string, fn: MatchMediaListener) => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    }),
    _listeners: listeners,
    _fire: (newMatches: boolean) => {
      mql.matches = newMatches;
      listeners.forEach((fn) => fn({ matches: newMatches } as MediaQueryListEvent));
    },
  };
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn(() => mql),
  });
  return mql;
}

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
    // Default matchMedia — prefers dark
    mockMatchMedia(true);
  });

  it("defaults to system when localStorage is empty", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("system");
  });

  it("returns light when localStorage has 'light'", () => {
    localStorage.setItem("theme", "light");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
  });

  it("returns dark when localStorage has 'dark'", () => {
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
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
  // getEffectiveTheme
  // -------------------------------------------------------------------------

  it("getEffectiveTheme resolves 'system' to 'dark' when prefers-color-scheme is dark", () => {
    mockMatchMedia(true);
    expect(getEffectiveTheme("system")).toBe("dark");
  });

  it("getEffectiveTheme resolves 'system' to 'light' when prefers-color-scheme is light", () => {
    mockMatchMedia(false);
    expect(getEffectiveTheme("system")).toBe("light");
  });

  // -------------------------------------------------------------------------
  // system theme class application
  // -------------------------------------------------------------------------

  it("applies dark theme class when theme is 'system' and OS prefers dark", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setTheme("system");
    });
    expect(document.documentElement.classList.contains(darkTheme)).toBe(true);
    expect(document.documentElement.classList.contains(lightTheme)).toBe(false);
  });

  it("applies light theme class when theme is 'system' and OS prefers light", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setTheme("system");
    });
    expect(document.documentElement.classList.contains(lightTheme)).toBe(true);
    expect(document.documentElement.classList.contains(darkTheme)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Tauri setTheme with null for system
  // -------------------------------------------------------------------------

  it("calls Tauri setTheme with null when theme is 'system'", async () => {
    const { result } = renderHook(() => useTheme());
    await act(async () => {
      result.current.setTheme("system");
      await Promise.resolve();
    });
    expect(mockSetThemeApp).toHaveBeenCalledWith(null);
  });

  // -------------------------------------------------------------------------
  // matchMedia change listener
  // -------------------------------------------------------------------------

  it("matchMedia change listener fires and re-applies class when OS preference changes", async () => {
    const mql = mockMatchMedia(true);
    localStorage.setItem("theme", "system");
    renderHook(() => useTheme());

    // Initially dark
    expect(document.documentElement.classList.contains(darkTheme)).toBe(true);

    await act(async () => {
      mql._fire(false);
    });

    expect(document.documentElement.classList.contains(lightTheme)).toBe(true);
    expect(document.documentElement.classList.contains(darkTheme)).toBe(false);
  });

  it("matchMedia listener is removed on unmount", async () => {
    const mql = mockMatchMedia(true);
    localStorage.setItem("theme", "system");
    const { unmount } = renderHook(() => useTheme());

    unmount();

    expect(mql.removeEventListener).toHaveBeenCalled();
  });

  it("matchMedia listener is removed when theme changes away from 'system'", async () => {
    const mql = mockMatchMedia(true);
    localStorage.setItem("theme", "system");
    const { result } = renderHook(() => useTheme());

    expect(mql.addEventListener).toHaveBeenCalled();

    act(() => {
      result.current.setTheme("dark");
    });

    expect(mql.removeEventListener).toHaveBeenCalled();
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
