import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { FolderHeader } from "@/components/HistoryList/FolderHeader";

vi.mock("@/components/HistoryList/index.css", () => ({
  folderHeader: "folderHeader",
  folderHeaderIcon: "folderHeaderIcon",
  folderHeaderLabel: "folderHeaderLabel",
  itemSelected: "itemSelected",
  shortcutHint: "shortcutHint",
}));

vi.mock("lucide-react", () => ({
  Folder: () => createElement("span", { "data-icon": "folder" }),
}));

function makeProps(overrides: Partial<Parameters<typeof FolderHeader>[0]> = {}) {
  return {
    name: "Work",
    count: 4,
    selected: false,
    hint: null,
    multiSelectActive: false,
    onClick: vi.fn(),
    onMouseMove: vi.fn(),
    ...overrides,
  };
}

describe("FolderHeader", () => {
  describe("rendering", () => {
    it("renders the folder icon", () => {
      const { container } = render(createElement(FolderHeader, makeProps()));
      expect(container.querySelector("[data-icon='folder']")).toBeInTheDocument();
    });

    it("renders the folder name and count", () => {
      render(createElement(FolderHeader, makeProps({ name: "Archive", count: 7 })));
      expect(screen.getByText("Archive (7)")).toBeInTheDocument();
    });

    it("renders the shortcut hint when hint is provided and multiSelectActive is false", () => {
      render(createElement(FolderHeader, makeProps({ hint: "⌘3", multiSelectActive: false })));
      expect(screen.getByText("⌘3")).toBeInTheDocument();
    });

    it("does not render the shortcut hint when hint is null", () => {
      const { container } = render(createElement(FolderHeader, makeProps({ hint: null })));
      expect(container.querySelector(".shortcutHint")).toBeNull();
    });

    it("does not render the shortcut hint when multiSelectActive is true", () => {
      const { container } = render(createElement(FolderHeader, makeProps({ hint: "⌘2", multiSelectActive: true })));
      expect(container.querySelector(".shortcutHint")).toBeNull();
    });

    it("applies itemSelected class when selected is true", () => {
      const { container } = render(createElement(FolderHeader, makeProps({ selected: true })));
      expect(container.querySelector("[data-folder-header]")?.className).toContain("itemSelected");
    });

    it("does not apply itemSelected class when selected is false", () => {
      const { container } = render(createElement(FolderHeader, makeProps({ selected: false })));
      expect(container.querySelector("[data-folder-header]")?.className).not.toContain("itemSelected");
    });
  });

  describe("interactions", () => {
    it("calls onClick when clicked", () => {
      const onClick = vi.fn();
      const { container } = render(createElement(FolderHeader, makeProps({ onClick })));
      fireEvent.click(container.querySelector("[data-folder-header]")!);
      expect(onClick).toHaveBeenCalledOnce();
    });

    it("calls onMouseMove on mouse move", () => {
      const onMouseMove = vi.fn();
      const { container } = render(createElement(FolderHeader, makeProps({ onMouseMove })));
      fireEvent.mouseMove(container.querySelector("[data-folder-header]")!);
      expect(onMouseMove).toHaveBeenCalledOnce();
    });
  });
});
