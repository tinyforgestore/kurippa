import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import {
  UIStoreContext,
  UIStore,
  useUIStore,
} from "@/store/ui";

describe("UIStoreContext — default value", () => {
  it("exposes closed preview, null paste text, hidden confirm, null updateInfo", () => {
    const { result } = renderHook(() => useUIStore());
    expect(result.current.previewPanelOpen).toBe(false);
    expect(result.current.pasteAsPreviewText).toBeNull();
    expect(result.current.clearConfirmShow).toBe(false);
    expect(result.current.updateInfo).toBeNull();
  });
});

describe("useUIStore — reads from context", () => {
  it("returns open preview panel and paste text from context", () => {
    const customValue: UIStore = {
      previewPanelOpen: true,
      pasteAsPreviewText: "some text",
      clearConfirmShow: false,
      updateInfo: null,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(UIStoreContext.Provider, { value: customValue }, children);

    const { result } = renderHook(() => useUIStore(), { wrapper });

    expect(result.current.previewPanelOpen).toBe(true);
    expect(result.current.pasteAsPreviewText).toBe("some text");
  });

  it("returns clearConfirmShow and updateInfo when set", () => {
    const customValue: UIStore = {
      previewPanelOpen: false,
      pasteAsPreviewText: null,
      clearConfirmShow: true,
      updateInfo: { version: "2.0.0" },
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(UIStoreContext.Provider, { value: customValue }, children);

    const { result } = renderHook(() => useUIStore(), { wrapper });

    expect(result.current.clearConfirmShow).toBe(true);
    expect(result.current.updateInfo).toEqual({ version: "2.0.0" });
  });

  it("returns null pasteAsPreviewText when not previewing", () => {
    const customValue: UIStore = {
      previewPanelOpen: false,
      pasteAsPreviewText: null,
      clearConfirmShow: false,
      updateInfo: null,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(UIStoreContext.Provider, { value: customValue }, children);

    const { result } = renderHook(() => useUIStore(), { wrapper });

    expect(result.current.pasteAsPreviewText).toBeNull();
  });
});
