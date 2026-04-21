import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePreviewPanel, PANEL_WIDTH } from "@/hooks/usePreviewPanel";

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

describe("usePreviewPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    mockSetSize.mockClear();
  });

  it("initialises isOpen to false when localStorage has no value", () => {
    const { result } = renderHook(() => usePreviewPanel());
    expect(result.current.isOpen).toBe(false);
  });

  it("initialises isOpen to false even when localStorage has 'true'", () => {
    localStorage.setItem("kurippa:preview-panel-open", "true");
    const { result } = renderHook(() => usePreviewPanel());
    expect(result.current.isOpen).toBe(false);
  });

  it("initialises isOpen to false when localStorage has 'false'", () => {
    localStorage.setItem("kurippa:preview-panel-open", "false");
    const { result } = renderHook(() => usePreviewPanel());
    expect(result.current.isOpen).toBe(false);
  });

  it("open() sets isOpen to true", () => {
    const { result } = renderHook(() => usePreviewPanel());
    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);
  });

  it("open() persists 'true' to localStorage", () => {
    const { result } = renderHook(() => usePreviewPanel());
    act(() => {
      result.current.open();
    });
    expect(localStorage.getItem("kurippa:preview-panel-open")).toBe("true");
  });

  it("open() calls setSize with expanded width (LIST_WIDTH + PANEL_WIDTH x 500)", async () => {
    const { result } = renderHook(() => usePreviewPanel());
    await act(async () => {
      result.current.open();
    });
    expect(mockSetSize).toHaveBeenCalledOnce();
    const sizeArg = mockSetSize.mock.calls[0][0];
    expect(sizeArg.width).toBe(400 + PANEL_WIDTH);
    expect(sizeArg.height).toBe(500);
  });

  it("close() sets isOpen to false", () => {
    const { result } = renderHook(() => usePreviewPanel());
    act(() => {
      result.current.open();
    });
    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("close() persists 'false' to localStorage", () => {
    const { result } = renderHook(() => usePreviewPanel());
    act(() => {
      result.current.open();
    });
    act(() => {
      result.current.close();
    });
    expect(localStorage.getItem("kurippa:preview-panel-open")).toBe("false");
  });

  it("close() calls setSize with collapsed width (400 x 500)", async () => {
    const { result } = renderHook(() => usePreviewPanel());
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

  it("open() then close() leaves isOpen false", () => {
    const { result } = renderHook(() => usePreviewPanel());
    act(() => {
      result.current.open();
    });
    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });
});
