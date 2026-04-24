import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, RefObject } from "react";
import { MemoryRouter } from "react-router-dom";
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
    it("clears folder name input and transitions to /folder-name-input with pickerItemId", () => {
      const setFolderNameInputValue = vi.fn();
      const { container } = renderAt(
        "/folder-picker",
        { itemId: 42 },
        makeProps({ setFolderNameInputValue })
      );
      fireEvent.click(container.querySelector("[data-action='create-folder']")!);
      expect(setFolderNameInputValue).toHaveBeenCalledWith("");
      expect(container.querySelector("[data-screen='folderNameInput']")).toBeInTheDocument();
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
