import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "@/store";
import { previewPanelOpenAtom } from "@/atoms/ui";
import { makeStoreWrapper } from "./renderWithStore";

describe("makeStoreWrapper", () => {
  it("returns a wrapper that renders children inside Jotai Provider + StoreProvider", () => {
    const { wrapper } = makeStoreWrapper();
    const { result } = renderHook(() => useUIStore(), { wrapper });
    expect(result.current.previewPanelOpen).toBe(false);
    expect(result.current.updateInfo).toBeNull();
  });

  it("returns a store that writes through to the rendered hook", () => {
    const { wrapper, store } = makeStoreWrapper();
    const { result } = renderHook(() => useUIStore(), { wrapper });
    expect(result.current.previewPanelOpen).toBe(false);
    act(() => {
      store.set(previewPanelOpenAtom, true);
    });
    expect(result.current.previewPanelOpen).toBe(true);
  });

  it("isolates state between independent calls", () => {
    const a = makeStoreWrapper();
    const b = makeStoreWrapper();
    expect(a.store).not.toBe(b.store);

    const renderedA = renderHook(() => useUIStore(), { wrapper: a.wrapper });
    const renderedB = renderHook(() => useUIStore(), { wrapper: b.wrapper });

    act(() => {
      a.store.set(previewPanelOpenAtom, true);
    });

    expect(renderedA.result.current.previewPanelOpen).toBe(true);
    expect(renderedB.result.current.previewPanelOpen).toBe(false);
  });

  it("does not wrap in MemoryRouter by default — useNavigate throws", () => {
    const { wrapper } = makeStoreWrapper();
    expect(() =>
      renderHook(() => useNavigate(), { wrapper }),
    ).toThrow();
  });

  it("wraps in MemoryRouter when { router: true } is passed — useNavigate works", () => {
    const { wrapper } = makeStoreWrapper({ router: true });
    const { result } = renderHook(() => useNavigate(), { wrapper });
    expect(typeof result.current).toBe("function");
  });
});
