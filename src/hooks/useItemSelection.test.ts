import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useItemSelection } from "@/hooks/useItemSelection";
import { ListEntry } from "@/types";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn().mockResolvedValue(undefined),
  error: vi.fn().mockResolvedValue(undefined),
  warn: vi.fn().mockResolvedValue(undefined),
  debug: vi.fn().mockResolvedValue(undefined),
  trace: vi.fn().mockResolvedValue(undefined),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

function makeItemEntry(id: number, pinned = false, text = `item-${id}`): ListEntry {
  return {
    kind: "item",
    result: {
      item: {
        id,
        kind: "text",
        text,
        html: null,
        rtf: null,
        image_path: null,
        source_app: null,
        created_at: id * 1000,
        pinned,
        folder_id: null,
        qr_text: null,
        image_width: null,
        image_height: null,
      },
      highlighted: text,
      score: 0,
      folder_name: null,
    },
  };
}

function makeImageEntry(id: number, imagePath: string | null): ListEntry {
  return {
    kind: "item",
    result: {
      item: {
        id,
        kind: "image",
        text: null,
        html: null,
        rtf: null,
        image_path: imagePath,
        source_app: null,
        created_at: id * 1000,
        pinned: false,
        folder_id: null,
        qr_text: null,
        image_width: null,
        image_height: null,
      },
      highlighted: null,
      score: 0,
      folder_name: null,
    },
  };
}

function makePinnedHeader(count: number): ListEntry {
  return { kind: "pinned-header", count };
}

function makeFolderHeader(folderId: number, name = `folder-${folderId}`): ListEntry {
  return { kind: "folder-header", folderId, name, count: 0, expanded: false };
}

function makeOptions(overrides: Partial<{
  onPinToggle: (id: number) => void;
  onDelete: (id: number) => void;
  inPinnedSection: boolean;
  onEnterSection: () => void;
  onExitSection: () => void;
  onEnterFolderSection: (id: number) => void;
  onExitFolderSection: () => void;
  onDeleteFolder: (id: number, name: string) => void;
  expandedFolderId: number | null;
  onOpenPreview: () => void;
  onClosePreview: () => void;
  onOpenPasteAs: (item: import("@/types").ClipboardItem) => void;
  enabled: boolean;
}> = {}) {
  return {
    onPinToggle: vi.fn(),
    onDelete: vi.fn(),
    inPinnedSection: false,
    onEnterSection: vi.fn(),
    onExitSection: vi.fn(),
    onOpenPreview: vi.fn(),
    onClosePreview: vi.fn(),
    onOpenPasteAs: vi.fn(),
    ...overrides,
  };
}

function fireKeydown(key: string, modifiers: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    ...modifiers,
  });
  document.dispatchEvent(event);
}

describe("useItemSelection", () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("basic navigation", () => {
    it("initialises selectedIndex to 0", () => {
      const entries: ListEntry[] = [makeItemEntry(1), makeItemEntry(2)];
      const { result } = renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions())
      );
      expect(result.current.selectedIndex).toBe(0);
    });

    it("ArrowDown increments selectedIndex", () => {
      const entries: ListEntry[] = [makeItemEntry(1), makeItemEntry(2), makeItemEntry(3)];
      const { result } = renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions())
      );

      act(() => {
        fireKeydown("ArrowDown");
      });
      expect(result.current.selectedIndex).toBe(1);
    });

    it("ArrowDown does not exceed last index", () => {
      const entries: ListEntry[] = [makeItemEntry(1)];
      const { result } = renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions())
      );

      act(() => {
        fireKeydown("ArrowDown");
      });
      expect(result.current.selectedIndex).toBe(0);
    });

    it("ArrowUp decrements selectedIndex", () => {
      const entries: ListEntry[] = [makeItemEntry(1), makeItemEntry(2)];
      const { result } = renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions())
      );

      act(() => {
        result.current.setSelectedIndex(1);
      });
      act(() => {
        fireKeydown("ArrowUp");
      });
      expect(result.current.selectedIndex).toBe(0);
    });

    it("ArrowUp does not go below 0", () => {
      const entries: ListEntry[] = [makeItemEntry(1), makeItemEntry(2)];
      const { result } = renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions())
      );

      act(() => {
        fireKeydown("ArrowUp");
      });
      expect(result.current.selectedIndex).toBe(0);
    });

    it("Escape calls dismiss", () => {
      const dismiss = vi.fn();
      const entries: ListEntry[] = [makeItemEntry(1)];
      renderHook(() => useItemSelection(entries, dismiss, "", makeOptions()));

      act(() => {
        fireKeydown("Escape");
      });
      expect(dismiss).toHaveBeenCalledOnce();
    });
  });

  describe("pin toggle (⌘P / Ctrl+P)", () => {
    it("calls onPinToggle with item id when ⌘P pressed on an item entry", () => {
      const onPinToggle = vi.fn();
      const entries: ListEntry[] = [makeItemEntry(42), makeItemEntry(99)];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions({ onPinToggle }))
      );

      act(() => {
        fireKeydown("p", { metaKey: true });
      });
      expect(onPinToggle).toHaveBeenCalledWith(42);
    });

    it("calls onPinToggle with item id when Ctrl+P pressed on an item entry", () => {
      const onPinToggle = vi.fn();
      const entries: ListEntry[] = [makeItemEntry(7)];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions({ onPinToggle }))
      );

      act(() => {
        fireKeydown("p", { ctrlKey: true });
      });
      expect(onPinToggle).toHaveBeenCalledWith(7);
    });

    it("does not call onPinToggle when selected entry is a pinned-header", () => {
      const onPinToggle = vi.fn();
      const entries: ListEntry[] = [makePinnedHeader(3), makeItemEntry(1)];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions({ onPinToggle }))
      );

      act(() => {
        fireKeydown("p", { metaKey: true });
      });
      expect(onPinToggle).not.toHaveBeenCalled();
    });
  });

  describe("delete integration (⌘Backspace)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("⌘Backspace on an item entry triggers onDelete end-to-end", () => {
      const onDelete = vi.fn();
      const entries: ListEntry[] = [makeItemEntry(10), makeItemEntry(20)];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions({ onDelete }))
      );

      act(() => {
        fireKeydown("Backspace", { metaKey: true });
        vi.runAllTimers();
      });
      expect(onDelete).toHaveBeenCalledWith(10);
    });

    it("⌘Delete on an item entry triggers onDelete end-to-end", () => {
      const onDelete = vi.fn();
      const entries: ListEntry[] = [makeItemEntry(10), makeItemEntry(20)];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions({ onDelete }))
      );

      act(() => {
        fireKeydown("Delete", { metaKey: true });
        vi.runAllTimers();
      });
      expect(onDelete).toHaveBeenCalledWith(10);
    });

    it("⌘Backspace on a pinned-header does not call onDelete", () => {
      const onDelete = vi.fn();
      const entries: ListEntry[] = [makePinnedHeader(2), makeItemEntry(1)];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions({ onDelete }))
      );

      act(() => {
        fireKeydown("Backspace", { metaKey: true });
        vi.runAllTimers();
      });
      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  describe("quick-activate (⌘0–9 / Ctrl+0–9)", () => {
    it("pastes the item at visual position 0 when ⌘0 pressed", () => {
      const entries: ListEntry[] = [makeItemEntry(10, false, "hello"), makeItemEntry(20)];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions())
      );

      act(() => {
        fireKeydown("0", { metaKey: true });
      });
      expect(mockInvoke).toHaveBeenCalledWith("paste_item", {
        text: "hello",
        plainText: false,
        itemId: 10,
      });
    });

    it("pastes the item at visual position 1 when ⌘1 pressed", () => {
      const entries: ListEntry[] = [makeItemEntry(10, false, "first"), makeItemEntry(20, false, "second")];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions())
      );

      act(() => {
        fireKeydown("1", { metaKey: true });
      });
      expect(mockInvoke).toHaveBeenCalledWith("paste_item", {
        text: "second",
        plainText: false,
        itemId: 20,
      });
    });

    it("calls onEnterSection when ⌘N targets a pinned-header position", () => {
      const onEnterSection = vi.fn();
      const entries: ListEntry[] = [
        makePinnedHeader(2),
        makeItemEntry(10, false, "first"),
      ];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions({ onEnterSection }))
      );

      act(() => {
        fireKeydown("0", { metaKey: true });
      });
      expect(onEnterSection).toHaveBeenCalledOnce();
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("does nothing when N is out of range", () => {
      const onEnterSection = vi.fn();
      const entries: ListEntry[] = [makeItemEntry(1)];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions({ onEnterSection }))
      );

      act(() => {
        fireKeydown("5", { metaKey: true });
      });
      expect(mockInvoke).not.toHaveBeenCalled();
      expect(onEnterSection).not.toHaveBeenCalled();
    });

    it("pastes at correct visual position even when header is at index 0", () => {
      const entries: ListEntry[] = [
        makePinnedHeader(2),
        makeItemEntry(10, false, "first"),
        makeItemEntry(20, false, "second"),
      ];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions())
      );

      act(() => {
        fireKeydown("2", { metaKey: true });
      });
      expect(mockInvoke).toHaveBeenCalledWith("paste_item", {
        text: "second",
        plainText: false,
        itemId: 20,
      });
    });
  });

  describe("section navigation", () => {
    it("Enter on a pinned-header calls onEnterSection", () => {
      const onEnterSection = vi.fn();
      const entries: ListEntry[] = [makePinnedHeader(3), makeItemEntry(1)];
      renderHook(() =>
        useItemSelection(
          entries,
          vi.fn(),
          "",
          makeOptions({ onEnterSection })
        )
      );

      act(() => {
        fireKeydown("Enter");
      });
      expect(onEnterSection).toHaveBeenCalledOnce();
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("Enter on a pinned-header does not invoke paste_item", () => {
      const entries: ListEntry[] = [makePinnedHeader(2), makeItemEntry(1)];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions())
      );

      act(() => {
        fireKeydown("Enter");
      });
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("ArrowLeft when inPinnedSection is true calls onExitSection", () => {
      const onExitSection = vi.fn();
      const entries: ListEntry[] = [makeItemEntry(1), makeItemEntry(2)];
      renderHook(() =>
        useItemSelection(
          entries,
          vi.fn(),
          "",
          makeOptions({ inPinnedSection: true, onExitSection })
        )
      );

      act(() => {
        fireKeydown("ArrowLeft");
      });
      expect(onExitSection).toHaveBeenCalledOnce();
    });

    it("ArrowLeft when inPinnedSection is false does not call onExitSection", () => {
      const onExitSection = vi.fn();
      const entries: ListEntry[] = [makeItemEntry(1)];
      renderHook(() =>
        useItemSelection(
          entries,
          vi.fn(),
          "",
          makeOptions({ inPinnedSection: false, onExitSection })
        )
      );

      act(() => {
        fireKeydown("ArrowLeft");
      });
      expect(onExitSection).not.toHaveBeenCalled();
    });

    it("ArrowLeft when inPinnedSection is true resets selectedIndex to 0", () => {
      const entries: ListEntry[] = [makeItemEntry(1), makeItemEntry(2), makeItemEntry(3)];
      const { result } = renderHook(() =>
        useItemSelection(
          entries,
          vi.fn(),
          "",
          makeOptions({ inPinnedSection: true })
        )
      );

      act(() => {
        result.current.setSelectedIndex(2);
      });
      act(() => {
        fireKeydown("ArrowLeft");
      });
      expect(result.current.selectedIndex).toBe(0);
    });

    it("Enter on a pinned-header resets selectedIndex to 0", () => {
      // Place pinned-header at index 1 so we can start at index 1 with a
      // non-zero selection, then confirm Enter resets it back to 0.
      const entries: ListEntry[] = [makeItemEntry(1), makePinnedHeader(3)];
      const { result } = renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions())
      );

      // Navigate to index 1 where the pinned-header sits
      act(() => {
        result.current.setSelectedIndex(1);
      });
      act(() => {
        fireKeydown("Enter");
      });
      expect(result.current.selectedIndex).toBe(0);
    });
  });

  describe("preview panel navigation (ArrowRight / ArrowLeft on item)", () => {
    it("ArrowRight on an item entry calls onOpenPreview", () => {
      const onOpenPreview = vi.fn();
      const entries: ListEntry[] = [makeItemEntry(1)];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions({ onOpenPreview }))
      );

      act(() => {
        fireKeydown("ArrowRight");
      });
      expect(onOpenPreview).toHaveBeenCalledOnce();
    });

    it("ArrowRight on a pinned-header calls onEnterSection (not onOpenPreview)", () => {
      const onEnterSection = vi.fn();
      const onOpenPreview = vi.fn();
      const entries: ListEntry[] = [makePinnedHeader(3), makeItemEntry(1)];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions({ onEnterSection, onOpenPreview }))
      );

      act(() => {
        fireKeydown("ArrowRight");
      });
      expect(onEnterSection).toHaveBeenCalledOnce();
      expect(onOpenPreview).not.toHaveBeenCalled();
    });

    it("ArrowRight on a pinned-header resets selectedIndex to 0", () => {
      const entries: ListEntry[] = [makeItemEntry(1), makePinnedHeader(3)];
      const { result } = renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions())
      );

      act(() => {
        result.current.setSelectedIndex(1);
      });
      act(() => {
        fireKeydown("ArrowRight");
      });
      expect(result.current.selectedIndex).toBe(0);
    });

    it("ArrowLeft on an item entry calls onClosePreview when not in pinned section", () => {
      const onClosePreview = vi.fn();
      const onExitSection = vi.fn();
      const entries: ListEntry[] = [makeItemEntry(1)];
      renderHook(() =>
        useItemSelection(
          entries,
          vi.fn(),
          "",
          makeOptions({ inPinnedSection: false, onClosePreview, onExitSection })
        )
      );

      act(() => {
        fireKeydown("ArrowLeft");
      });
      expect(onClosePreview).toHaveBeenCalledOnce();
      expect(onExitSection).not.toHaveBeenCalled();
    });

    it("ArrowLeft when inPinnedSection calls onExitSection (not onClosePreview)", () => {
      const onExitSection = vi.fn();
      const onClosePreview = vi.fn();
      const entries: ListEntry[] = [makeItemEntry(1), makeItemEntry(2)];
      renderHook(() =>
        useItemSelection(
          entries,
          vi.fn(),
          "",
          makeOptions({ inPinnedSection: true, onExitSection, onClosePreview })
        )
      );

      act(() => {
        fireKeydown("ArrowLeft");
      });
      expect(onExitSection).toHaveBeenCalledOnce();
      expect(onClosePreview).not.toHaveBeenCalled();
    });
  });

  describe("folder-header interactions", () => {
    it("Enter on a folder-header calls onEnterFolderSection with its id", () => {
      const onEnterFolderSection = vi.fn();
      const entries: ListEntry[] = [makeFolderHeader(7)];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions({ onEnterFolderSection }))
      );

      act(() => { fireKeydown("Enter"); });
      expect(onEnterFolderSection).toHaveBeenCalledWith(7);
    });

    it("Enter on a folder-header resets selectedIndex to 0", () => {
      const entries: ListEntry[] = [makeItemEntry(1), makeFolderHeader(7)];
      const { result } = renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions())
      );

      act(() => { result.current.setSelectedIndex(1); });
      act(() => { fireKeydown("Enter"); });
      expect(result.current.selectedIndex).toBe(0);
    });

    it("ArrowRight on a folder-header calls onEnterFolderSection with its id", () => {
      const onEnterFolderSection = vi.fn();
      const entries: ListEntry[] = [makeFolderHeader(3)];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions({ onEnterFolderSection }))
      );

      act(() => { fireKeydown("ArrowRight"); });
      expect(onEnterFolderSection).toHaveBeenCalledWith(3);
    });

    it("⌘Backspace on a folder-header calls onDeleteFolder with its id and name", () => {
      const onDeleteFolder = vi.fn();
      const entries: ListEntry[] = [makeFolderHeader(5, "Work")];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions({ onDeleteFolder }))
      );

      act(() => { fireKeydown("Backspace", { metaKey: true }); });
      expect(onDeleteFolder).toHaveBeenCalledWith(5, "Work");
    });

    it("⌘Delete on a folder-header calls onDeleteFolder with its id and name", () => {
      const onDeleteFolder = vi.fn();
      const entries: ListEntry[] = [makeFolderHeader(5, "Work")];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions({ onDeleteFolder }))
      );

      act(() => { fireKeydown("Delete", { metaKey: true }); });
      expect(onDeleteFolder).toHaveBeenCalledWith(5, "Work");
    });

    it("⌘N quick-activate on a folder-header calls onEnterFolderSection", () => {
      const onEnterFolderSection = vi.fn();
      const entries: ListEntry[] = [makeFolderHeader(9)];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions({ onEnterFolderSection }))
      );

      act(() => { fireKeydown("0", { metaKey: true }); });
      expect(onEnterFolderSection).toHaveBeenCalledWith(9);
    });
  });

  describe("pasteSelected", () => {
    it("does not invoke paste_item when selected entry is a pinned-header", () => {
      const entries: ListEntry[] = [makePinnedHeader(3), makeItemEntry(1)];
      const { result } = renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions())
      );

      act(() => {
        result.current.pasteSelected(false);
      });
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("invokes paste_item when selected entry is an item", () => {
      const entries: ListEntry[] = [makeItemEntry(1, false, "paste me")];
      const { result } = renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions())
      );

      act(() => {
        result.current.pasteSelected(false);
      });
      expect(mockInvoke).toHaveBeenCalledWith("paste_item", {
        text: "paste me",
        plainText: false,
        itemId: 1,
      });
    });

    it("Enter key triggers paste on an item entry", () => {
      const entries: ListEntry[] = [makeItemEntry(1, false, "enter-paste")];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions())
      );

      act(() => {
        fireKeydown("Enter");
      });
      expect(mockInvoke).toHaveBeenCalledWith("paste_item", {
        text: "enter-paste",
        plainText: false,
        itemId: 1,
      });
    });

    it("Shift+Enter calls onOpenPasteAs with the current item", () => {
      const onOpenPasteAs = vi.fn();
      const entries: ListEntry[] = [makeItemEntry(1, false, "plain-text-paste")];
      renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions({ onOpenPasteAs }))
      );

      act(() => {
        fireKeydown("Enter", { shiftKey: true });
      });
      expect(onOpenPasteAs).toHaveBeenCalledWith(entries[0].kind === "item" ? entries[0].result.item : null);
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("calls paste_image_item when item is an image with a valid path", () => {
      const entries: ListEntry[] = [makeImageEntry(42, "42.png")];
      const { result } = renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions())
      );

      act(() => {
        result.current.pasteSelected(false);
      });
      expect(mockInvoke).toHaveBeenCalledWith("paste_image_item", { imageFilename: "42.png", itemId: 42 });
    });

    it("calls paste_item when image item has null image_path", () => {
      const entries: ListEntry[] = [makeImageEntry(10, null)];
      const { result } = renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions())
      );

      act(() => {
        result.current.pasteSelected(false);
      });
      expect(mockInvoke).toHaveBeenCalledWith("paste_item", expect.objectContaining({ text: "[image]" }));
    });

    it("calls paste_item when image item is pasted with plainText=true", () => {
      const entries: ListEntry[] = [makeImageEntry(99, "42.png")];
      const { result } = renderHook(() =>
        useItemSelection(entries, vi.fn(), "", makeOptions())
      );

      act(() => {
        result.current.pasteSelected(true);
      });
      expect(mockInvoke).toHaveBeenCalledWith("paste_item", expect.objectContaining({ plainText: true }));
    });
  });

});

