import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { FolderPicker } from "@/components/FolderPicker/index";
import { Folder } from "@/types";

vi.mock("./index.css", () => ({
  container: "container",
  pickerTitle: "pickerTitle",
  folderOption: "folderOption",
  folderOptionActive: "folderOptionActive",
  folderOptionFocused: "folderOptionFocused",
  folderOptionKey: "folderOptionKey",
  folderOptionLabel: "folderOptionLabel",
  folderOptionCount: "folderOptionCount",
  newFolderOption: "newFolderOption",
  newFolderOptionFocused: "newFolderOptionFocused",
  hint: "hint",
}));

function makeFolder(id: number, name: string): Folder {
  return { id, name, created_at: id * 1000, position: id };
}

const FOLDERS: Folder[] = [
  makeFolder(1, "Work"),
  makeFolder(2, "Personal"),
  makeFolder(3, "Archive"),
];

function makeProps(overrides: Partial<Parameters<typeof FolderPicker>[0]> = {}) {
  return {
    folders: FOLDERS,
    currentFolderId: null,
    onSelectFolder: vi.fn(),
    onRemoveFromFolder: vi.fn(),
    onCreateNewFolder: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe("FolderPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("render states", () => {
    it("renders the title", () => {
      render(createElement(FolderPicker, makeProps()));
      expect(screen.getByText(/Move to folder/)).toBeTruthy();
    });

    it("renders all folder names", () => {
      render(createElement(FolderPicker, makeProps()));
      expect(screen.getByText("Work")).toBeTruthy();
      expect(screen.getByText("Personal")).toBeTruthy();
      expect(screen.getByText("Archive")).toBeTruthy();
    });

    it("renders the New folder option", () => {
      render(createElement(FolderPicker, makeProps()));
      expect(screen.getByText(/New folder/)).toBeTruthy();
    });

    it("renders the keyboard hint", () => {
      render(createElement(FolderPicker, makeProps()));
      expect(screen.getByText(/Tab \/ ↑↓ to navigate/)).toBeTruthy();
    });

    it("renders with empty folders list", () => {
      render(createElement(FolderPicker, makeProps({ folders: [] })));
      expect(screen.getByText(/New folder/)).toBeTruthy();
    });

    it("applies folderOptionActive class to current folder", () => {
      const { container } = render(createElement(FolderPicker, makeProps({ currentFolderId: 2 })));
      const active = container.querySelector(".folderOptionActive");
      expect(active?.textContent).toContain("Personal");
    });
  });

  describe("mouse interactions", () => {
    it("clicking a non-current folder calls onSelectFolder with its id", () => {
      const props = makeProps();
      render(createElement(FolderPicker, props));
      fireEvent.click(screen.getByText("Work").closest(".folderOption")!);
      expect(props.onSelectFolder).toHaveBeenCalledWith(1);
    });

    it("clicking the current folder calls onRemoveFromFolder", () => {
      const props = makeProps({ currentFolderId: 2 });
      render(createElement(FolderPicker, props));
      fireEvent.click(screen.getByText("Personal").closest(".folderOption")!);
      expect(props.onRemoveFromFolder).toHaveBeenCalledOnce();
      expect(props.onSelectFolder).not.toHaveBeenCalled();
    });

    it("clicking New folder calls onCreateNewFolder", () => {
      const props = makeProps();
      render(createElement(FolderPicker, props));
      fireEvent.click(screen.getByText(/New folder/).closest(".newFolderOption")!);
      expect(props.onCreateNewFolder).toHaveBeenCalledOnce();
    });

    it("mouseEnter on a folder option updates the cursor (focused class)", () => {
      render(createElement(FolderPicker, makeProps()));
      const secondOption = screen.getByText("Personal").closest(".folderOption")!;
      fireEvent.mouseEnter(secondOption);
      expect(secondOption.className).toContain("folderOptionFocused");
    });

    it("mouseEnter on New folder sets focused class on it", () => {
      render(createElement(FolderPicker, makeProps()));
      const newFolderEl = screen.getByText(/New folder/).closest(".newFolderOption")!;
      fireEvent.mouseEnter(newFolderEl);
      expect(newFolderEl.className).toContain("newFolderOptionFocused");
    });
  });

  describe("keyboard interactions", () => {
    it("Escape calls onCancel", () => {
      const props = makeProps();
      render(createElement(FolderPicker, props));
      fireEvent.keyDown(document, { key: "Escape" });
      expect(props.onCancel).toHaveBeenCalledOnce();
    });

    it("ArrowDown moves cursor to next option", () => {
      const { container } = render(createElement(FolderPicker, makeProps()));
      fireEvent.keyDown(document, { key: "ArrowDown" });
      const options = container.querySelectorAll(".folderOption");
      expect(options[1].className).toContain("folderOptionFocused");
    });

    it("ArrowUp wraps to last option from first", () => {
      render(createElement(FolderPicker, makeProps()));
      fireEvent.keyDown(document, { key: "ArrowUp" });
      // cursor wraps: from 0 to total-1 = 3 (new folder index)
      const newFolderEl = screen.getByText(/New folder/).closest(".newFolderOption")!;
      expect(newFolderEl.className).toContain("newFolderOptionFocused");
    });

    it("Tab moves cursor forward", () => {
      const { container } = render(createElement(FolderPicker, makeProps()));
      fireEvent.keyDown(document, { key: "Tab" });
      const options = container.querySelectorAll(".folderOption");
      expect(options[1].className).toContain("folderOptionFocused");
    });

    it("Shift+Tab moves cursor backward (wraps to last)", () => {
      render(createElement(FolderPicker, makeProps()));
      fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
      const newFolderEl = screen.getByText(/New folder/).closest(".newFolderOption")!;
      expect(newFolderEl.className).toContain("newFolderOptionFocused");
    });

    it("Enter on a folder option calls onSelectFolder", () => {
      const props = makeProps();
      render(createElement(FolderPicker, props));
      // cursor starts at 0 (Work)
      fireEvent.keyDown(document, { key: "Enter" });
      expect(props.onSelectFolder).toHaveBeenCalledWith(1);
    });

    it("Enter on the New folder option calls onCreateNewFolder", () => {
      const props = makeProps();
      render(createElement(FolderPicker, props));
      // move cursor to new-folder slot (index 3 = folders.length)
      for (let i = 0; i < FOLDERS.length; i++) {
        fireEvent.keyDown(document, { key: "ArrowDown" });
      }
      fireEvent.keyDown(document, { key: "Enter" });
      expect(props.onCreateNewFolder).toHaveBeenCalledOnce();
    });

    it("pressing 1 selects first folder", () => {
      const props = makeProps();
      render(createElement(FolderPicker, props));
      fireEvent.keyDown(document, { key: "1" });
      expect(props.onSelectFolder).toHaveBeenCalledWith(1);
    });

    it("pressing 2 selects second folder", () => {
      const props = makeProps();
      render(createElement(FolderPicker, props));
      fireEvent.keyDown(document, { key: "2" });
      expect(props.onSelectFolder).toHaveBeenCalledWith(2);
    });

    it("pressing a number beyond folder count does nothing", () => {
      const props = makeProps({ folders: [makeFolder(1, "Solo")] });
      render(createElement(FolderPicker, props));
      fireEvent.keyDown(document, { key: "9" });
      expect(props.onSelectFolder).not.toHaveBeenCalled();
    });
  });
});
