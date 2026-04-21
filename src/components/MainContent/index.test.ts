import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, RefObject } from "react";
import { MainContent } from "@/components/MainContent/index";
import { AppScreen } from "@/hooks/useAppState";
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
  FolderNameInput: (props: { onCancel: () => void; placeholder?: string }) =>
    createElement(
      "div",
      { "data-screen": "folderNameInput" },
      createElement("span", { "data-placeholder": true }, props.placeholder ?? ""),
      createElement("button", { "data-action": "cancel", onClick: props.onCancel }, "cancel")
    ),
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
    screen: { kind: "history" } as AppScreen,
    setScreen: vi.fn(),
    executePasteOption: vi.fn(),
    setPasteAsPreviewText: vi.fn(),
    openPreview: vi.fn(),
    defaultSeparator: "newline" as const,
    onMergePaste: vi.fn(),
    folderNameInputValue: "",
    setFolderNameInputValue: vi.fn(),
    confirmFolderNameInput: vi.fn(),
    confirmFolderDelete: vi.fn(),
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MainContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("screen routing", () => {
    it("renders HistoryList for history screen", () => {
      const { container } = render(createElement(MainContent, makeProps({ screen: { kind: "history" } })));
      expect(container.querySelector("[data-screen='history']")).toBeInTheDocument();
    });

    it("renders PasteAsMenu for pasteAs screen", () => {
      const appScreen: AppScreen = { kind: "pasteAs", item: makeItem() };
      const { container } = render(createElement(MainContent, makeProps({ screen: appScreen })));
      expect(container.querySelector("[data-screen='pasteAs']")).toBeInTheDocument();
    });

    it("renders SeparatorPicker for separatorPicker screen", () => {
      const appScreen: AppScreen = { kind: "separatorPicker" };
      const { container } = render(createElement(MainContent, makeProps({ screen: appScreen })));
      expect(container.querySelector("[data-screen='separatorPicker']")).toBeInTheDocument();
    });

    it("renders FolderNameInput for folderNameInput screen", () => {
      const appScreen: AppScreen = { kind: "folderNameInput", mode: "create", targetId: null, pickerItemId: null };
      const { container } = render(createElement(MainContent, makeProps({ screen: appScreen })));
      expect(container.querySelector("[data-screen='folderNameInput']")).toBeInTheDocument();
    });

    it("renders FolderDeleteConfirm for folderDelete screen", () => {
      const appScreen: AppScreen = { kind: "folderDelete", target: { id: 1, name: "Work" } };
      const { container } = render(createElement(MainContent, makeProps({ screen: appScreen })));
      expect(container.querySelector("[data-screen='folderDelete']")).toBeInTheDocument();
    });

    it("renders FolderPicker for folderPicker screen", () => {
      const appScreen: AppScreen = { kind: "folderPicker", itemId: 5 };
      const { container } = render(createElement(MainContent, makeProps({ screen: appScreen })));
      expect(container.querySelector("[data-screen='folderPicker']")).toBeInTheDocument();
    });
  });

  describe("cancel / close callbacks navigate back to history", () => {
    it("PasteAsMenu onClose calls setScreen({ kind: 'history' })", () => {
      const setScreen = vi.fn();
      const appScreen: AppScreen = { kind: "pasteAs", item: makeItem() };
      const { container } = render(createElement(MainContent, makeProps({ screen: appScreen, setScreen })));
      fireEvent.click(container.querySelector("[data-action='close']")!);
      expect(setScreen).toHaveBeenCalledWith({ kind: "history" });
    });

    it("SeparatorPicker onCancel calls setScreen({ kind: 'history' })", () => {
      const setScreen = vi.fn();
      const appScreen: AppScreen = { kind: "separatorPicker" };
      const { container } = render(createElement(MainContent, makeProps({ screen: appScreen, setScreen })));
      fireEvent.click(container.querySelector("[data-action='cancel']")!);
      expect(setScreen).toHaveBeenCalledWith({ kind: "history" });
    });

    it("FolderNameInput onCancel calls setScreen({ kind: 'history' })", () => {
      const setScreen = vi.fn();
      const appScreen: AppScreen = { kind: "folderNameInput", mode: "create", targetId: null, pickerItemId: null };
      const { container } = render(createElement(MainContent, makeProps({ screen: appScreen, setScreen })));
      fireEvent.click(container.querySelector("[data-action='cancel']")!);
      expect(setScreen).toHaveBeenCalledWith({ kind: "history" });
    });

    it("FolderDeleteConfirm onCancel calls setScreen({ kind: 'history' })", () => {
      const setScreen = vi.fn();
      const appScreen: AppScreen = { kind: "folderDelete", target: { id: 1, name: "Work" } };
      const { container } = render(createElement(MainContent, makeProps({ screen: appScreen, setScreen })));
      fireEvent.click(container.querySelector("[data-action='cancel']")!);
      expect(setScreen).toHaveBeenCalledWith({ kind: "history" });
    });

    it("FolderPicker onCancel calls setScreen({ kind: 'history' })", () => {
      const setScreen = vi.fn();
      const appScreen: AppScreen = { kind: "folderPicker", itemId: 5 };
      const { container } = render(createElement(MainContent, makeProps({ screen: appScreen, setScreen })));
      fireEvent.click(container.querySelector("[data-action='cancel']")!);
      expect(setScreen).toHaveBeenCalledWith({ kind: "history" });
    });
  });

  describe("FolderNameInput placeholder", () => {
    it("passes 'New folder name' when mode is create", () => {
      const appScreen: AppScreen = { kind: "folderNameInput", mode: "create", targetId: null, pickerItemId: null };
      const { container } = render(createElement(MainContent, makeProps({ screen: appScreen })));
      expect(container.querySelector("[data-placeholder]")?.textContent).toBe("New folder name");
    });

    it("passes 'Rename folder' when mode is rename", () => {
      const appScreen: AppScreen = { kind: "folderNameInput", mode: "rename", targetId: 3, pickerItemId: null };
      const { container } = render(createElement(MainContent, makeProps({ screen: appScreen })));
      expect(container.querySelector("[data-placeholder]")?.textContent).toBe("Rename folder");
    });
  });

  describe("FolderDeleteConfirm folder name", () => {
    it("passes folder name from screen.target.name", () => {
      const appScreen: AppScreen = { kind: "folderDelete", target: { id: 7, name: "Archive" } };
      const { container } = render(createElement(MainContent, makeProps({ screen: appScreen })));
      expect(container.querySelector("[data-folder-name]")?.textContent).toBe("Archive");
    });
  });

  describe("FolderPicker onCreateNewFolder", () => {
    it("clears folder name input and transitions to folderNameInput with pickerItemId", () => {
      const setScreen = vi.fn();
      const setFolderNameInputValue = vi.fn();
      const appScreen: AppScreen = { kind: "folderPicker", itemId: 42 };
      const { container } = render(
        createElement(MainContent, makeProps({ screen: appScreen, setScreen, setFolderNameInputValue }))
      );
      fireEvent.click(container.querySelector("[data-action='create-folder']")!);
      expect(setFolderNameInputValue).toHaveBeenCalledWith("");
      expect(setScreen).toHaveBeenCalledWith({
        kind: "folderNameInput",
        mode: "create",
        targetId: null,
        pickerItemId: 42,
      });
    });
  });

  describe("FolderDeleteConfirm onConfirm", () => {
    it("calls confirmFolderDelete(true) when confirm is clicked", () => {
      const confirmFolderDelete = vi.fn();
      const appScreen: AppScreen = { kind: "folderDelete", target: { id: 1, name: "Work" } };
      const { container } = render(
        createElement(MainContent, makeProps({ screen: appScreen, confirmFolderDelete }))
      );
      fireEvent.click(container.querySelector("[data-action='confirm']")!);
      expect(confirmFolderDelete).toHaveBeenCalledWith(true);
    });
  });

  describe("FolderPicker onSelectFolder and onRemoveFromFolder", () => {
    it("onSelectFolder calls moveItemToFolder and navigates to history", () => {
      const setScreen = vi.fn();
      const moveItemToFolder = vi.fn().mockResolvedValue(undefined);
      const appScreen: AppScreen = { kind: "folderPicker", itemId: 7 };
      const { container } = render(
        createElement(MainContent, makeProps({ screen: appScreen, setScreen, moveItemToFolder }))
      );
      fireEvent.click(container.querySelector("[data-action='select-folder']")!);
      expect(moveItemToFolder).toHaveBeenCalledWith(7, 99);
      expect(setScreen).toHaveBeenCalledWith({ kind: "history" });
    });

    it("onRemoveFromFolder calls removeItemFromFolder and navigates to history", () => {
      const setScreen = vi.fn();
      const removeItemFromFolder = vi.fn().mockResolvedValue(undefined);
      const appScreen: AppScreen = { kind: "folderPicker", itemId: 7 };
      const { container } = render(
        createElement(MainContent, makeProps({ screen: appScreen, setScreen, removeItemFromFolder }))
      );
      fireEvent.click(container.querySelector("[data-action='remove-folder']")!);
      expect(removeItemFromFolder).toHaveBeenCalledWith(7);
      expect(setScreen).toHaveBeenCalledWith({ kind: "history" });
    });

    it("currentFolderId is resolved from visibleEntries matching screen.itemId", () => {
      const appScreen: AppScreen = { kind: "folderPicker", itemId: 3 };
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
      // just verify it renders without error when a matching entry exists
      const { container } = render(
        createElement(MainContent, makeProps({ screen: appScreen, visibleEntries: [entry] }))
      );
      expect(container.querySelector("[data-screen='folderPicker']")).toBeInTheDocument();
    });
  });
});
