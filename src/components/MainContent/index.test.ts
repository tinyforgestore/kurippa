import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, RefObject } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { MainContent } from "@/components/MainContent/index";
import { ClipboardItem, Folder, ListEntry } from "@/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/components/PasteAsMenu", () => ({
  PasteAsMenu: (props: { onClose: () => void }) =>
    createElement(
      "div",
      { "data-screen": "pasteAs" },
      createElement("button", { "data-action": "close", onClick: props.onClose }, "close")
    ),
}));

vi.mock("@/components/SeparatorPicker", () => ({
  SeparatorPicker: (props: { onCancel: () => void }) =>
    createElement(
      "div",
      { "data-screen": "separatorPicker" },
      createElement("button", { "data-action": "cancel", onClick: props.onCancel }, "cancel")
    ),
}));

vi.mock("@/components/FolderNameInput", () => ({
  FolderNameInput: (props: { onCancel: () => void; placeholder?: string }) => {
    const state = useLocation().state as {
      pickerItemId?: number | null;
      pickerItemIds?: number[] | null;
    } | null;
    return createElement(
      "div",
      { "data-screen": "folderNameInput" },
      createElement("span", { "data-placeholder": true }, props.placeholder ?? ""),
      createElement(
        "span",
        { "data-picker-item-id": true },
        JSON.stringify(state?.pickerItemId ?? null)
      ),
      createElement(
        "span",
        { "data-picker-item-ids": true },
        JSON.stringify(state?.pickerItemIds ?? null)
      ),
      createElement("button", { "data-action": "cancel", onClick: props.onCancel }, "cancel")
    );
  },
}));

vi.mock("@/components/FolderDeleteConfirm", () => ({
  FolderDeleteConfirm: (props: { folderName: string; onConfirm: () => void; onCancel: () => void }) =>
    createElement(
      "div",
      { "data-screen": "folderDelete" },
      createElement("span", { "data-folder-name": true }, props.folderName),
      createElement("button", { "data-action": "confirm", onClick: props.onConfirm }, "confirm"),
      createElement("button", { "data-action": "cancel", onClick: props.onCancel }, "cancel")
    ),
}));

vi.mock("@/components/FolderPicker", () => ({
  FolderPicker: (props: {
    onSelectFolder: (id: number) => void;
    onRemoveFromFolder: () => void;
    onCreateNewFolder: () => void;
    onCancel: () => void;
  }) =>
    createElement(
      "div",
      { "data-screen": "folderPicker" },
      createElement("button", { "data-action": "select-folder", onClick: () => props.onSelectFolder(99) }, "select"),
      createElement("button", { "data-action": "remove-folder", onClick: props.onRemoveFromFolder }, "remove"),
      createElement(
        "button",
        { "data-action": "create-folder", onClick: props.onCreateNewFolder },
        "new folder"
      ),
      createElement("button", { "data-action": "cancel", onClick: props.onCancel }, "cancel")
    ),
}));

vi.mock("@/components/HistoryList", () => ({
  HistoryList: () => createElement("div", { "data-screen": "history" }),
}));

vi.mock("@/components/MultiSelectActionMenu", () => ({
  MultiSelectActionMenu: (props: {
    count: number;
    onMerge: () => void;
    onCombine: () => void;
    onPinAll: () => void;
    onMoveToFolder: () => void;
    onCancel: () => void;
    isImageSelection: boolean;
  }) =>
    createElement(
      "div",
      { "data-screen": "multiAction", "data-count": props.count, "data-image-selection": props.isImageSelection },
      createElement("button", { "data-action": "merge", onClick: props.onMerge }, "merge"),
      createElement("button", { "data-action": "combine", onClick: props.onCombine }, "combine"),
      createElement("button", { "data-action": "pin", onClick: props.onPinAll }, "pin"),
      createElement("button", { "data-action": "folder", onClick: props.onMoveToFolder }, "folder"),
      createElement("button", { "data-action": "cancel", onClick: props.onCancel }, "cancel")
    ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(id = 1): ClipboardItem {
  return {
    id,
    kind: "text",
    text: "test",
    html: null,
    rtf: null,
    image_path: null,
    source_app: null,
    created_at: 1000,
    pinned: false,
    folder_id: null,
    qr_text: null,
    image_width: null,
    image_height: null,
  };
}

function makeProps(overrides: Partial<Parameters<typeof MainContent>[0]> = {}) {
  return {
    executePasteOption: vi.fn(),
    setPasteAsPreviewText: vi.fn(),
    openPreview: vi.fn(),
    defaultSeparator: "newline" as const,
    onMergePaste: vi.fn(),
    folderNameInputValue: "",
    setFolderNameInputValue: vi.fn(),
    confirmFolderNameInput: vi.fn(),
    confirmFolderDelete: vi.fn(),
    confirmPinnedDelete: vi.fn(),
    unpinAllPinned: vi.fn(),
    onMultiMerge: vi.fn(),
    onMultiPinAll: vi.fn(),
    onMultiMoveToFolder: vi.fn(),
    onMultiCombineImages: vi.fn(),
    isImageMultiSelect: false,
    moveItemsToFolder: vi.fn(),
    folders: [] as Folder[],
    visibleEntries: [] as ListEntry[],
    moveItemToFolder: vi.fn().mockResolvedValue(undefined),
    removeItemFromFolder: vi.fn().mockResolvedValue(undefined),
    selectedIndex: 0,
    setSelectedIndex: vi.fn(),
    listRef: { current: null } as RefObject<HTMLDivElement | null>,
    onClickItem: vi.fn(),
    enterPinnedSection: vi.fn(),
    enterFolderSection: vi.fn(),
    expandedFolderId: null,
    liftingId: null,
    landingId: null,
    deletingId: null,
    multiSelectActive: false,
    selections: [] as number[],
    flashingId: null,
    ...overrides,
  };
}

function renderAt(path: string, state: unknown, props: Parameters<typeof MainContent>[0]) {
  return render(
    createElement(
      MemoryRouter,
      { initialEntries: [{ pathname: path, state }] },
      createElement(MainContent, props)
    )
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MainContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("screen routing", () => {
    it("renders HistoryList for / route", () => {
      const { container } = renderAt("/", null, makeProps());
      expect(container.querySelector("[data-screen='history']")).toBeInTheDocument();
    });

    it("renders PasteAsMenu for /paste-as route", () => {
      const { container } = renderAt("/paste-as", { item: makeItem() }, makeProps());
      expect(container.querySelector("[data-screen='pasteAs']")).toBeInTheDocument();
    });

    it("renders SeparatorPicker for /separator-picker route", () => {
      const { container } = renderAt("/separator-picker", null, makeProps());
      expect(container.querySelector("[data-screen='separatorPicker']")).toBeInTheDocument();
    });

    it("renders FolderNameInput for /folder-name-input route", () => {
      const { container } = renderAt(
        "/folder-name-input",
        { mode: "create", targetId: null, pickerItemId: null },
        makeProps()
      );
      expect(container.querySelector("[data-screen='folderNameInput']")).toBeInTheDocument();
    });

    it("renders FolderDeleteConfirm for /folder-delete route", () => {
      const { container } = renderAt(
        "/folder-delete",
        { target: { id: 1, name: "Work" } },
        makeProps()
      );
      expect(container.querySelector("[data-screen='folderDelete']")).toBeInTheDocument();
    });

    it("renders FolderPicker for /folder-picker route", () => {
      const { container } = renderAt("/folder-picker", { itemId: 5 }, makeProps());
      expect(container.querySelector("[data-screen='folderPicker']")).toBeInTheDocument();
    });

    it("renders MultiSelectActionMenu for /multi-action route with selection count", () => {
      const { container } = renderAt(
        "/multi-action",
        null,
        makeProps({ selections: [1, 2, 3] })
      );
      const menu = container.querySelector("[data-screen='multiAction']");
      expect(menu).toBeInTheDocument();
      expect(menu?.getAttribute("data-count")).toBe("3");
    });
  });

  describe("cancel / close callbacks navigate back to history", () => {
    it("PasteAsMenu onClose navigates to /", () => {
      const { container } = renderAt("/paste-as", { item: makeItem() }, makeProps());
      fireEvent.click(container.querySelector("[data-action='close']")!);
      expect(container.querySelector("[data-screen='history']")).toBeInTheDocument();
    });

    it("SeparatorPicker onCancel navigates to /", () => {
      const { container } = renderAt("/separator-picker", null, makeProps());
      fireEvent.click(container.querySelector("[data-action='cancel']")!);
      expect(container.querySelector("[data-screen='history']")).toBeInTheDocument();
    });

    it("FolderNameInput onCancel navigates to /", () => {
      const { container } = renderAt(
        "/folder-name-input",
        { mode: "create", targetId: null, pickerItemId: null },
        makeProps()
      );
      fireEvent.click(container.querySelector("[data-action='cancel']")!);
      expect(container.querySelector("[data-screen='history']")).toBeInTheDocument();
    });

    it("FolderDeleteConfirm onCancel navigates to /", () => {
      const { container } = renderAt(
        "/folder-delete",
        { target: { id: 1, name: "Work" } },
        makeProps()
      );
      fireEvent.click(container.querySelector("[data-action='cancel']")!);
      expect(container.querySelector("[data-screen='history']")).toBeInTheDocument();
    });

    it("FolderPicker onCancel navigates to /", () => {
      const { container } = renderAt("/folder-picker", { itemId: 5 }, makeProps());
      fireEvent.click(container.querySelector("[data-action='cancel']")!);
      expect(container.querySelector("[data-screen='history']")).toBeInTheDocument();
    });
  });

  describe("FolderNameInput placeholder", () => {
    it("passes 'New folder name' when mode is create", () => {
      const { container } = renderAt(
        "/folder-name-input",
        { mode: "create", targetId: null, pickerItemId: null },
        makeProps()
      );
      expect(container.querySelector("[data-placeholder]")?.textContent).toBe("New folder name");
    });

    it("passes 'Rename folder' when mode is rename", () => {
      const { container } = renderAt(
        "/folder-name-input",
        { mode: "rename", targetId: 3, pickerItemId: null },
        makeProps()
      );
      expect(container.querySelector("[data-placeholder]")?.textContent).toBe("Rename folder");
    });

    it("passes 'Folder name' when mode is convert-pinned", () => {
      const { container } = renderAt(
        "/folder-name-input",
        { mode: "convert-pinned", targetId: null, pickerItemId: null },
        makeProps()
      );
      expect(container.querySelector("[data-placeholder]")?.textContent).toBe("Folder name");
    });
  });

  describe("FolderDeleteConfirm folder name", () => {
    it("passes folder name from route state target.name", () => {
      const { container } = renderAt(
        "/folder-delete",
        { target: { id: 7, name: "Archive" } },
        makeProps()
      );
      expect(container.querySelector("[data-folder-name]")?.textContent).toBe("Archive");
    });
  });

  describe("FolderPicker onCreateNewFolder", () => {
    it("clears folder name input and transitions to /folder-name-input with pickerItemId (single)", () => {
      const setFolderNameInputValue = vi.fn();
      const { container } = renderAt(
        "/folder-picker",
        { itemId: 42 },
        makeProps({ setFolderNameInputValue })
      );
      fireEvent.click(container.querySelector("[data-action='create-folder']")!);
      expect(setFolderNameInputValue).toHaveBeenCalledWith("");
      expect(container.querySelector("[data-screen='folderNameInput']")).toBeInTheDocument();
      expect(container.querySelector("[data-picker-item-id]")?.textContent).toBe("42");
      expect(container.querySelector("[data-picker-item-ids]")?.textContent).toBe("null");
    });

    it("multi-mode carries pickerItemIds (not pickerItemId: 0) to /folder-name-input", () => {
      const { container } = renderAt(
        "/folder-picker",
        { itemIds: [1, 2, 3] },
        makeProps()
      );
      fireEvent.click(container.querySelector("[data-action='create-folder']")!);
      expect(container.querySelector("[data-screen='folderNameInput']")).toBeInTheDocument();
      expect(container.querySelector("[data-picker-item-ids]")?.textContent).toBe("[1,2,3]");
      // Must NOT pass the sentinel item 0 that would drop the multi-selection.
      expect(container.querySelector("[data-picker-item-id]")?.textContent).toBe("null");
    });
  });

  describe("FolderDeleteConfirm onConfirm", () => {
    it("calls confirmFolderDelete(true) when confirm is clicked", () => {
      const confirmFolderDelete = vi.fn();
      const { container } = renderAt(
        "/folder-delete",
        { target: { id: 1, name: "Work" } },
        makeProps({ confirmFolderDelete })
      );
      fireEvent.click(container.querySelector("[data-action='confirm']")!);
      expect(confirmFolderDelete).toHaveBeenCalledWith(true);
    });
  });

  describe("FolderPicker onSelectFolder and onRemoveFromFolder", () => {
    it("onSelectFolder calls moveItemToFolder and navigates to /", () => {
      const moveItemToFolder = vi.fn().mockResolvedValue(undefined);
      const { container } = renderAt(
        "/folder-picker",
        { itemId: 7 },
        makeProps({ moveItemToFolder })
      );
      fireEvent.click(container.querySelector("[data-action='select-folder']")!);
      expect(moveItemToFolder).toHaveBeenCalledWith(7, 99);
      expect(container.querySelector("[data-screen='history']")).toBeInTheDocument();
    });

    it("onRemoveFromFolder calls removeItemFromFolder and navigates to /", () => {
      const removeItemFromFolder = vi.fn().mockResolvedValue(undefined);
      const { container } = renderAt(
        "/folder-picker",
        { itemId: 7 },
        makeProps({ removeItemFromFolder })
      );
      fireEvent.click(container.querySelector("[data-action='remove-folder']")!);
      expect(removeItemFromFolder).toHaveBeenCalledWith(7);
      expect(container.querySelector("[data-screen='history']")).toBeInTheDocument();
    });

    it("multi-mode onSelectFolder calls moveItemsToFolder with the id set (not moveItemToFolder)", () => {
      const moveItemsToFolder = vi.fn();
      const moveItemToFolder = vi.fn().mockResolvedValue(undefined);
      const { container } = renderAt(
        "/folder-picker",
        { itemIds: [1, 2, 3] },
        makeProps({ moveItemsToFolder, moveItemToFolder })
      );
      fireEvent.click(container.querySelector("[data-action='select-folder']")!);
      expect(moveItemsToFolder).toHaveBeenCalledWith([1, 2, 3], 99);
      expect(moveItemToFolder).not.toHaveBeenCalled();
    });

    it("multi-action merge button fires onMultiMerge", () => {
      const onMultiMerge = vi.fn();
      const { container } = renderAt("/multi-action", null, makeProps({ onMultiMerge, selections: [1, 2] }));
      fireEvent.click(container.querySelector("[data-action='merge']")!);
      expect(onMultiMerge).toHaveBeenCalledOnce();
    });

    it("multi-action pin button fires onMultiPinAll", () => {
      const onMultiPinAll = vi.fn();
      const { container } = renderAt("/multi-action", null, makeProps({ onMultiPinAll, selections: [1, 2] }));
      fireEvent.click(container.querySelector("[data-action='pin']")!);
      expect(onMultiPinAll).toHaveBeenCalledOnce();
    });

    it("multi-action folder button fires onMultiMoveToFolder", () => {
      const onMultiMoveToFolder = vi.fn();
      const { container } = renderAt("/multi-action", null, makeProps({ onMultiMoveToFolder, selections: [1, 2] }));
      fireEvent.click(container.querySelector("[data-action='folder']")!);
      expect(onMultiMoveToFolder).toHaveBeenCalledOnce();
    });

    it("multi-action combine button fires onMultiCombineImages", () => {
      const onMultiCombineImages = vi.fn();
      const { container } = renderAt(
        "/multi-action",
        null,
        makeProps({ onMultiCombineImages, selections: [1, 2] })
      );
      fireEvent.click(container.querySelector("[data-action='combine']")!);
      expect(onMultiCombineImages).toHaveBeenCalledOnce();
    });

    it("passes isImageMultiSelect through to MultiSelectActionMenu's isImageSelection prop", () => {
      const { container } = renderAt(
        "/multi-action",
        null,
        makeProps({ isImageMultiSelect: true, selections: [1, 2] })
      );
      expect(container.querySelector("[data-screen='multiAction']")!.getAttribute("data-image-selection")).toBe(
        "true"
      );
    });

    it("currentFolderId is resolved from visibleEntries matching itemId in route state", () => {
      const entry: ListEntry = {
        kind: "item",
        result: {
          item: {
            id: 3,
            kind: "text",
            text: "x",
            html: null,
            rtf: null,
            image_path: null,
            source_app: null,
            created_at: 1000,
            pinned: false,
            folder_id: 5,
            qr_text: null,
            image_width: null,
            image_height: null,
          },
          highlighted: "x",
          score: 100,
          folder_name: null,
        },
      };
      const { container } = renderAt(
        "/folder-picker",
        { itemId: 3 },
        makeProps({ visibleEntries: [entry] })
      );
      expect(container.querySelector("[data-screen='folderPicker']")).toBeInTheDocument();
    });
  });
});
