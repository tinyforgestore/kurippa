import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { Provider, createStore } from "jotai";
import { StoreProvider } from "@/store";
import { useWindowDismiss } from "@/hooks/useWindowDismiss";
import { PANEL_DISMISSED } from "@/constants/events";

function makeWrapper() {
  const store = createStore();
  return { wrapper: ({ children }: { children: React.ReactNode }) => createElement(Provider, { store }, createElement(StoreProvider, null, children)) };
}

const mockHide = vi.fn().mockResolvedValue(undefined);
const mockUnlisten = vi.fn();
const mockListenUnlisten = vi.fn();
let capturedFocusCallback: ((event: { payload: boolean }) => void) | null = null;
let capturedPanelDismissedCallback: (() => void) | null = null;

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    hide: mockHide,
    onFocusChanged: vi.fn((cb) => {
      capturedFocusCallback = cb;
      return Promise.resolve(mockUnlisten);
    }),
  }),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn((eventName: string, cb: () => void) => {
    if (eventName === PANEL_DISMISSED) capturedPanelDismissedCallback = cb;
    return Promise.resolve(mockListenUnlisten);
  }),
}));

vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn().mockResolvedValue(undefined),
  error: vi.fn().mockResolvedValue(undefined),
  warn: vi.fn().mockResolvedValue(undefined),
  debug: vi.fn().mockResolvedValue(undefined),
  trace: vi.fn().mockResolvedValue(undefined),
}));

describe("useWindowDismiss", () => {
  beforeEach(() => {
    mockHide.mockClear();
    mockUnlisten.mockClear();
    mockListenUnlisten.mockClear();
    capturedFocusCallback = null;
    capturedPanelDismissedCallback = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("dismiss()", () => {
    it("calling dismiss() clears query to empty string", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useWindowDismiss(), { wrapper });

      // Set a non-empty query first
      act(() => {
        result.current.setQuery("hello");
      });
      expect(result.current.query).toBe("hello");

      act(() => {
        result.current.dismiss();
      });
      expect(result.current.query).toBe("");
    });

    it("calling dismiss() calls hide()", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useWindowDismiss(), { wrapper });

      act(() => {
        result.current.dismiss();
      });
      expect(mockHide).toHaveBeenCalledOnce();
    });
  });

  describe("setQuery", () => {
    it("setQuery updates query state", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useWindowDismiss(), { wrapper });

      act(() => {
        result.current.setQuery("hello");
      });
      expect(result.current.query).toBe("hello");
    });
  });

  describe("onFocusChanged — focus gained", () => {
    it("focus gained resets query to empty string", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useWindowDismiss(), { wrapper });

      // Capture the callback registered via onFocusChanged
      await act(async () => {
        await Promise.resolve();
      });

      // Set a non-empty query first
      act(() => {
        result.current.setQuery("filter text");
      });
      expect(result.current.query).toBe("filter text");

      act(() => {
        capturedFocusCallback?.({ payload: true });
      });
      expect(result.current.query).toBe("");
    });

    it("focus gained calls onShow callback", async () => {
      const onShow = vi.fn();
      const { wrapper } = makeWrapper();
      renderHook(() => useWindowDismiss(onShow), { wrapper });

      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        capturedFocusCallback?.({ payload: true });
      });
      expect(onShow).toHaveBeenCalledOnce();
    });

    it("focus gained does not error when onShow is omitted", async () => {
      const { wrapper } = makeWrapper();
      renderHook(() => useWindowDismiss(), { wrapper });

      await act(async () => {
        await Promise.resolve();
      });

      expect(() => {
        act(() => {
          capturedFocusCallback?.({ payload: true });
        });
      }).not.toThrow();
    });
  });

  describe("onFocusChanged — focus lost", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("focus lost more than 300ms after last focus calls dismiss (hide)", async () => {
      const { wrapper } = makeWrapper();
      renderHook(() => useWindowDismiss(), { wrapper });

      await act(async () => {
        await Promise.resolve();
      });

      // Simulate gaining focus at t=0
      vi.setSystemTime(0);
      act(() => {
        capturedFocusCallback?.({ payload: true });
      });

      // Simulate losing focus at t=400ms (> 300ms guard)
      vi.setSystemTime(400);
      act(() => {
        capturedFocusCallback?.({ payload: false });
      });

      expect(mockHide).toHaveBeenCalled();
    });

    it("focus lost within 300ms of gaining focus does NOT call hide", async () => {
      const { wrapper } = makeWrapper();
      renderHook(() => useWindowDismiss(), { wrapper });

      await act(async () => {
        await Promise.resolve();
      });

      // Simulate gaining focus at t=0
      vi.setSystemTime(0);
      act(() => {
        capturedFocusCallback?.({ payload: true });
      });

      // Simulate losing focus at t=100ms (< 300ms guard) — should be suppressed
      vi.setSystemTime(100);
      act(() => {
        capturedFocusCallback?.({ payload: false });
      });

      expect(mockHide).not.toHaveBeenCalled();
    });
  });

  describe("PANEL_DISMISSED (macOS native resign-key bridge)", () => {
    it("firing PANEL_DISMISSED clears query to empty string", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useWindowDismiss(), { wrapper });

      // Allow the listen() promise to resolve and capture the callback.
      await act(async () => {
        await Promise.resolve();
      });

      // Set a non-empty query first.
      act(() => {
        result.current.setQuery("filter text");
      });
      expect(result.current.query).toBe("filter text");

      act(() => {
        capturedPanelDismissedCallback?.();
      });
      expect(result.current.query).toBe("");
    });

    it("firing PANEL_DISMISSED calls hide() (via dismiss)", async () => {
      const { wrapper } = makeWrapper();
      renderHook(() => useWindowDismiss(), { wrapper });

      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        capturedPanelDismissedCallback?.();
      });
      expect(mockHide).toHaveBeenCalled();
    });

    it("unsubscribes the PANEL_DISMISSED listener on unmount", async () => {
      const { wrapper } = makeWrapper();
      const { unmount } = renderHook(() => useWindowDismiss(), { wrapper });

      await act(async () => {
        await Promise.resolve();
      });

      unmount();

      // Give the listen() .then() a chance to assign unlisten.
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockListenUnlisten).toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("calls the unlisten function when the hook unmounts", async () => {
      const { wrapper } = makeWrapper();
      const { unmount } = renderHook(() => useWindowDismiss(), { wrapper });

      await act(async () => {
        await Promise.resolve();
      });

      unmount();

      // Give microtasks a chance to resolve (the cleanup uses .then())
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockUnlisten).toHaveBeenCalledOnce();
    });
  });
});
