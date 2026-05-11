import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePasteActions } from "@/hooks/usePasteActions";
import { getPasteOptions, type PasteOption } from "@/utils/pasteAs";
import { ClipboardItem } from "@/types";
import { TRIAL_ERROR } from "@/constants/errors";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

const mockNav = {
  toHistory: vi.fn(),
  toPasteAs: vi.fn(),
  toSeparatorPicker: vi.fn(),
  toFolderNameInput: vi.fn(),
  toFolderDelete: vi.fn(),
  toFolderPicker: vi.fn(),
};
vi.mock("@/hooks/useAppNavigation", () => ({ useAppNavigation: () => mockNav }));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/", state: null }),
}));

function makeMultiSelect(overrides = {}) {
  return {
    selections: [] as number[],
    exitMode: vi.fn(),
    ...overrides,
  };
}

function makeItem(overrides: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "text", text: "hello", html: null, rtf: null, image_path: null,
    source_app: null, created_at: 0, pinned: false, folder_id: null,
    qr_text: null, image_width: null, image_height: null, ...overrides,
  };
}

describe("usePasteActions", () => {
  beforeEach(() => { vi.clearAllMocks(); mockInvoke.mockResolvedValue(undefined); });

  describe("executePasteOption", () => {
    it("invokes paste_item with plainText=true for text plain option", () => {
      const item = makeItem({ id: 1, kind: "text", text: "hello" });
      const options = getPasteOptions(item);
      // text.plain is the first leaf option for text entries
      const plainOption = options[0];
      const { result } = renderHook(() => usePasteActions({ multiSelect: makeMultiSelect(), dismiss: vi.fn() }));
      act(() => result.current.executePasteOption(plainOption));
      expect(mockInvoke).toHaveBeenCalledWith("paste_item", { text: "hello", plainText: true, itemId: 1 });
      expect(mockNav.toHistory).toHaveBeenCalledOnce();
    });

    it("invokes paste_item with plainText=false for rich text option", () => {
      const item = makeItem({ id: 2, kind: "rtf", text: "<b>hi</b>", rtf: "<b>hi</b>" });
      const options = getPasteOptions(item);
      // rtf strategies: rtf.rich is the first leaf
      const richOption = options[0];
      const { result } = renderHook(() => usePasteActions({ multiSelect: makeMultiSelect(), dismiss: vi.fn() }));
      act(() => result.current.executePasteOption(richOption));
      expect(mockInvoke).toHaveBeenCalledWith("paste_item", { text: "<b>hi</b>", plainText: false, itemId: 2 });
    });

    it("invokes paste_image_item for image paste option", () => {
      const item = makeItem({ id: 3, kind: "image", text: null, image_path: "img.png" });
      const options = getPasteOptions(item);
      // image.paste is the first option for image entries
      const imageOption = options[0];
      const { result } = renderHook(() => usePasteActions({ multiSelect: makeMultiSelect(), dismiss: vi.fn() }));
      act(() => result.current.executePasteOption(imageOption));
      expect(mockInvoke).toHaveBeenCalledWith("paste_image_item", { imageFilename: "img.png", itemId: 3 });
    });

    it("logs an error and does not invoke when option is not registered with a strategy", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const syntheticOption: PasteOption = {
        label: "Synthetic", action: { kind: "paste-text", text: "x", itemId: 99 },
      };
      const { result } = renderHook(() => usePasteActions({ multiSelect: makeMultiSelect(), dismiss: vi.fn() }));
      act(() => result.current.executePasteOption(syntheticOption));
      expect(mockInvoke).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith("[paste] no strategy registered for option");
      consoleSpy.mockRestore();
    });
  });

  describe("onMergePaste", () => {
    it("invokes merge_and_paste_items with selections and separator", async () => {
      const dismiss = vi.fn();
      const multiSelect = makeMultiSelect({ selections: [1, 2, 3] });
      const { result } = renderHook(() => usePasteActions({ multiSelect, dismiss }));
      await act(() => result.current.onMergePaste(","));
      expect(mockInvoke).toHaveBeenCalledWith("merge_and_paste_items", { itemIds: [1, 2, 3], separator: "," });
      expect(multiSelect.exitMode).toHaveBeenCalledOnce();
      expect(mockNav.toHistory).toHaveBeenCalledOnce();
      expect(dismiss).toHaveBeenCalledOnce();
    });

    it("calls onTrialError with 'Multi-paste' when error is 'trial'", async () => {
      mockInvoke.mockRejectedValueOnce(TRIAL_ERROR);
      const dismiss = vi.fn();
      const onTrialError = vi.fn();
      const multiSelect = makeMultiSelect({ selections: [1, 2] });
      const { result } = renderHook(() =>
        usePasteActions({ multiSelect, dismiss, onTrialError })
      );
      await act(() => result.current.onMergePaste(","));
      expect(onTrialError).toHaveBeenCalledWith("Multi-paste");
      expect(multiSelect.exitMode).not.toHaveBeenCalled();
    });

    it("calls console.error for non-trial merge errors", async () => {
      mockInvoke.mockRejectedValueOnce("some_other_error");
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const dismiss = vi.fn();
      const multiSelect = makeMultiSelect({ selections: [1] });
      const { result } = renderHook(() =>
        usePasteActions({ multiSelect, dismiss })
      );
      await act(() => result.current.onMergePaste(","));
      expect(consoleSpy).toHaveBeenCalledWith("some_other_error");
      consoleSpy.mockRestore();
    });

    it("does not call toHistory or dismiss when merge fails", async () => {
      mockInvoke.mockRejectedValueOnce(TRIAL_ERROR);
      const dismiss = vi.fn();
      const onTrialError = vi.fn();
      const multiSelect = makeMultiSelect({ selections: [1] });
      const { result } = renderHook(() =>
        usePasteActions({ multiSelect, dismiss, onTrialError })
      );
      await act(() => result.current.onMergePaste(","));
      expect(mockNav.toHistory).not.toHaveBeenCalled();
      expect(dismiss).not.toHaveBeenCalled();
    });
  });

  describe("executePasteOption — no-op when action is missing", () => {
    it("does not invoke any command when action is undefined", () => {
      const { result } = renderHook(() =>
        usePasteActions({ multiSelect: makeMultiSelect(), dismiss: vi.fn() })
      );
      act(() => result.current.executePasteOption({ label: "No action", submenu: [] }));
      expect(mockInvoke).not.toHaveBeenCalled();
      expect(mockNav.toHistory).not.toHaveBeenCalled();
    });
  });
});
