import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { Provider, createStore } from "jotai";
import { StoreProvider } from "@/store";
import { useClearConfirm } from "@/hooks/useClearConfirm";

function makeWrapper() {
  const store = createStore();
  return { wrapper: ({ children }: { children: React.ReactNode }) => createElement(Provider, { store }, createElement(StoreProvider, null, children)) };
}

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

function fireKey(key: string, modifiers: Partial<KeyboardEventInit> = {}) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...modifiers }));
}

describe("useClearConfirm", () => {
  beforeEach(() => { vi.clearAllMocks(); mockInvoke.mockResolvedValue(undefined); });

  it("show is false initially", () => {
    const clearNonPinned = vi.fn();
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearConfirm({ clearNonPinned }), { wrapper });
    expect(result.current.show).toBe(false);
  });

  it("onRequest sets show to true", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearConfirm({ clearNonPinned: vi.fn() }), { wrapper });
    act(() => result.current.onRequest());
    expect(result.current.show).toBe(true);
  });

  it("onCancel sets show to false", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearConfirm({ clearNonPinned: vi.fn() }), { wrapper });
    act(() => result.current.onRequest());
    act(() => result.current.onCancel());
    expect(result.current.show).toBe(false);
  });

  it("onConfirm hides, calls clearNonPinned, and invokes clear_history", () => {
    const clearNonPinned = vi.fn();
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearConfirm({ clearNonPinned }), { wrapper });
    act(() => result.current.onRequest());
    act(() => result.current.onConfirm());
    expect(result.current.show).toBe(false);
    expect(clearNonPinned).toHaveBeenCalledOnce();
    expect(mockInvoke).toHaveBeenCalledWith("clear_history");
  });

  it("Cmd+Alt+Backspace sets show to true", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearConfirm({ clearNonPinned: vi.fn() }), { wrapper });
    act(() => fireKey("Backspace", { metaKey: true, altKey: true }));
    expect(result.current.show).toBe(true);
  });

  it("Escape hides confirm when visible", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearConfirm({ clearNonPinned: vi.fn() }), { wrapper });
    act(() => result.current.onRequest());
    act(() => fireKey("Escape"));
    expect(result.current.show).toBe(false);
  });

  it("Escape does nothing when confirm is not visible", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearConfirm({ clearNonPinned: vi.fn() }), { wrapper });
    act(() => fireKey("Escape"));
    expect(result.current.show).toBe(false);
  });
});
