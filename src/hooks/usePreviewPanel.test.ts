import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { Provider, createStore } from "jotai";
import { StoreProvider } from "@/store";
import { usePreviewPanel, PANEL_WIDTH } from "@/hooks/usePreviewPanel";

function makeWrapper() {
  const store = createStore();
  return { wrapper: ({ children }: { children: React.ReactNode }) => createElement(Provider, { store }, createElement(StoreProvider, null, children)) };
}

// Mock Tauri webviewWindow
const mockSetSize = vi.fn().mockResolvedValue(undefined);
vi.mock("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({ setSize: mockSetSize }),
}));

// Mock LogicalSize
vi.mock("@tauri-apps/api/window", () => ({
  LogicalSize: class LogicalSize {
    width: number;
    height: number;
    constructor(w: number, h: number) {
      this.width = w;
      this.height = h;
    }
  },
}));

// Mock Tauri invoke
const mockInvoke = vi.fn().mockResolvedValue(undefined);
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe("usePreviewPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    mockSetSize.mockClear();
    mockInvoke.mockClear();
  });

  it("initialises isOpen to false when localStorage has no value", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => usePreviewPanel(), { wrapper });
    expect(result.current.isOpen).toBe(false);
  });

  it("initialises isOpen to false even when localStorage has 'true'", () => {
    localStorage.setItem("kurippa:preview-panel-open", "true");
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => usePreviewPanel(), { wrapper });
    expect(result.current.isOpen).toBe(false);
  });

  it("initialises isOpen to false when localStorage has 'false'", () => {
    localStorage.setItem("kurippa:preview-panel-open", "false");
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => usePreviewPanel(), { wrapper });
    expect(result.current.isOpen).toBe(false);
  });

  it("open() sets isOpen to true", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => usePreviewPanel(), { wrapper });
    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);
  });

  it("open() persists 'true' to localStorage", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => usePreviewPanel(), { wrapper });
    act(() => {
      result.current.open();
    });
    expect(localStorage.getItem("kurippa:preview-panel-open")).toBe("true");
  });

  it("open() calls setSize with expanded width (LIST_WIDTH + PANEL_WIDTH x 500)", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => usePreviewPanel(), { wrapper });
    await act(async () => {
      result.current.open();
    });
    expect(mockSetSize).toHaveBeenCalledOnce();
    const sizeArg = mockSetSize.mock.calls[0][0];
    expect(sizeArg.width).toBe(400 + PANEL_WIDTH);
    expect(sizeArg.height).toBe(500);
  });

  it("close() sets isOpen to false", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => usePreviewPanel(), { wrapper });
    act(() => {
      result.current.open();
    });
    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("close() persists 'false' to localStorage", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => usePreviewPanel(), { wrapper });
    act(() => {
      result.current.open();
    });
    act(() => {
      result.current.close();
    });
    expect(localStorage.getItem("kurippa:preview-panel-open")).toBe("false");
  });

  it("close() calls setSize with collapsed width (400 x 500)", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => usePreviewPanel(), { wrapper });
    await act(async () => {
      result.current.open();
    });
    mockSetSize.mockClear();
    await act(async () => {
      result.current.close();
    });
    expect(mockSetSize).toHaveBeenCalledOnce();
    const sizeArg = mockSetSize.mock.calls[0][0];
    expect(sizeArg.width).toBe(400);
    expect(sizeArg.height).toBe(500);
  });

  it("open() resizes window then invokes reclamp_main_window", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => usePreviewPanel(), { wrapper });
    await act(async () => {
      result.current.open();
      // flush microtasks so the .then(() => invoke(...)) chain runs
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockSetSize).toHaveBeenCalledOnce();
    expect(mockInvoke).toHaveBeenCalledOnce();
    expect(mockInvoke).toHaveBeenCalledWith("reclamp_main_window", { width: 400 + PANEL_WIDTH, height: 500 });
    // setSize must be called before invoke (chained via .then)
    const setSizeOrder = mockSetSize.mock.invocationCallOrder[0];
    const invokeOrder = mockInvoke.mock.invocationCallOrder[0];
    expect(setSizeOrder).toBeLessThan(invokeOrder);
  });

  it("close() resizes back without invoking reclamp_main_window", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => usePreviewPanel(), { wrapper });
    await act(async () => {
      result.current.open();
      await Promise.resolve();
      await Promise.resolve();
    });
    mockSetSize.mockClear();
    mockInvoke.mockClear();
    await act(async () => {
      result.current.close();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockSetSize).toHaveBeenCalledOnce();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("close() does nothing if already closed", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => usePreviewPanel(), { wrapper });
    await act(async () => {
      result.current.close();
      await Promise.resolve();
    });
    expect(mockSetSize).not.toHaveBeenCalled();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("open() then close() leaves isOpen false", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => usePreviewPanel(), { wrapper });
    act(() => {
      result.current.open();
    });
    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });
});
