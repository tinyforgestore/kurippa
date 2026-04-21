import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePasteActions } from "@/hooks/usePasteActions";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

function makeMultiSelect(overrides = {}) {
  return {
    selections: [] as number[],
    exitMode: vi.fn(),
    ...overrides,
  };
}

describe("usePasteActions", () => {
  beforeEach(() => { vi.clearAllMocks(); mockInvoke.mockResolvedValue(undefined); });

  describe("executePasteOption", () => {
    it("invokes paste_item with plainText=true for paste-text action", () => {
      const setScreen = vi.fn();
      const { result } = renderHook(() => usePasteActions({ setScreen, multiSelect: makeMultiSelect(), dismiss: vi.fn() }));
      act(() => result.current.executePasteOption({
        label: "Plain text", action: { kind: "paste-text", text: "hello", itemId: 1 },
      }));
      expect(mockInvoke).toHaveBeenCalledWith("paste_item", { text: "hello", plainText: true, itemId: 1 });
      expect(setScreen).toHaveBeenCalledWith({ kind: "history" });
    });

    it("invokes paste_item with plainText=false for paste-as action", () => {
      const setScreen = vi.fn();
      const { result } = renderHook(() => usePasteActions({ setScreen, multiSelect: makeMultiSelect(), dismiss: vi.fn() }));
      act(() => result.current.executePasteOption({
        label: "Rich text", action: { kind: "paste-rich", text: "<b>hi</b>", itemId: 2 },
      }));
      expect(mockInvoke).toHaveBeenCalledWith("paste_item", { text: "<b>hi</b>", plainText: false, itemId: 2 });
    });

    it("invokes paste_image_item for paste-image action", () => {
      const setScreen = vi.fn();
      const { result } = renderHook(() => usePasteActions({ setScreen, multiSelect: makeMultiSelect(), dismiss: vi.fn() }));
      act(() => result.current.executePasteOption({
        label: "Image", action: { kind: "paste-image", imageFilename: "img.png", itemId: 3 },
      }));
      expect(mockInvoke).toHaveBeenCalledWith("paste_image_item", { imageFilename: "img.png", itemId: 3 });
    });
  });

  describe("onMergePaste", () => {
    it("invokes merge_and_paste_items with selections and separator", async () => {
      const setScreen = vi.fn();
      const dismiss = vi.fn();
      const multiSelect = makeMultiSelect({ selections: [1, 2, 3] });
      const { result } = renderHook(() => usePasteActions({ setScreen, multiSelect, dismiss }));
      await act(() => result.current.onMergePaste(","));
      expect(mockInvoke).toHaveBeenCalledWith("merge_and_paste_items", { itemIds: [1, 2, 3], separator: "," });
      expect(multiSelect.exitMode).toHaveBeenCalledOnce();
      expect(setScreen).toHaveBeenCalledWith({ kind: "history" });
      expect(dismiss).toHaveBeenCalledOnce();
    });

    it("calls onTrialError with 'Multi-paste' when error is 'trial'", async () => {
      mockInvoke.mockRejectedValueOnce("trial");
      const setScreen = vi.fn();
      const dismiss = vi.fn();
      const onTrialError = vi.fn();
      const multiSelect = makeMultiSelect({ selections: [1, 2] });
      const { result } = renderHook(() =>
        usePasteActions({ setScreen, multiSelect, dismiss, onTrialError })
      );
      await act(() => result.current.onMergePaste(","));
      expect(onTrialError).toHaveBeenCalledWith("Multi-paste");
      expect(multiSelect.exitMode).not.toHaveBeenCalled();
    });

    it("calls console.error for non-trial merge errors", async () => {
      mockInvoke.mockRejectedValueOnce("some_other_error");
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const setScreen = vi.fn();
      const dismiss = vi.fn();
      const multiSelect = makeMultiSelect({ selections: [1] });
      const { result } = renderHook(() =>
        usePasteActions({ setScreen, multiSelect, dismiss })
      );
      await act(() => result.current.onMergePaste(","));
      expect(consoleSpy).toHaveBeenCalledWith("some_other_error");
      consoleSpy.mockRestore();
    });

    it("does not call setScreen or dismiss when merge fails", async () => {
      mockInvoke.mockRejectedValueOnce("trial");
      const setScreen = vi.fn();
      const dismiss = vi.fn();
      const onTrialError = vi.fn();
      const multiSelect = makeMultiSelect({ selections: [1] });
      const { result } = renderHook(() =>
        usePasteActions({ setScreen, multiSelect, dismiss, onTrialError })
      );
      await act(() => result.current.onMergePaste(","));
      expect(setScreen).not.toHaveBeenCalled();
      expect(dismiss).not.toHaveBeenCalled();
    });
  });

  describe("executePasteOption — no-op when action is missing", () => {
    it("does not invoke any command when action is undefined", () => {
      const setScreen = vi.fn();
      const { result } = renderHook(() =>
        usePasteActions({ setScreen, multiSelect: makeMultiSelect(), dismiss: vi.fn() })
      );
      act(() => result.current.executePasteOption({ label: "No action", submenu: [] }));
      expect(mockInvoke).not.toHaveBeenCalled();
      expect(setScreen).not.toHaveBeenCalled();
    });
  });
});
