import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { FolderDeleteConfirm } from "@/components/FolderDeleteConfirm/index";

vi.mock("./index.css", () => ({
  container: "container",
  title: "title",
  confirmButton: "confirmButton",
  hint: "hint",
}));

function makeProps(overrides: Partial<Parameters<typeof FolderDeleteConfirm>[0]> = {}) {
  return {
    folderName: "My Folder",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe("FolderDeleteConfirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("render states", () => {
    it("renders the folder name in the title", () => {
      render(createElement(FolderDeleteConfirm, makeProps({ folderName: "Work" })));
      expect(screen.getByText(/Work/)).toBeTruthy();
    });

    it("renders the confirm button", () => {
      render(createElement(FolderDeleteConfirm, makeProps()));
      expect(screen.getByText("Yes, delete")).toBeTruthy();
    });

    it("renders the keyboard hint", () => {
      render(createElement(FolderDeleteConfirm, makeProps()));
      expect(screen.getByText(/Enter \/ Y to confirm/)).toBeTruthy();
    });
  });

  describe("mouse interactions", () => {
    it("clicking Yes, delete calls onConfirm", () => {
      const props = makeProps();
      render(createElement(FolderDeleteConfirm, props));
      fireEvent.click(screen.getByText("Yes, delete"));
      expect(props.onConfirm).toHaveBeenCalledOnce();
    });
  });

  describe("keyboard interactions", () => {
    it("Enter calls onConfirm", () => {
      const props = makeProps();
      render(createElement(FolderDeleteConfirm, props));
      fireEvent.keyDown(document, { key: "Enter" });
      expect(props.onConfirm).toHaveBeenCalledOnce();
    });

    it("y calls onConfirm", () => {
      const props = makeProps();
      render(createElement(FolderDeleteConfirm, props));
      fireEvent.keyDown(document, { key: "y" });
      expect(props.onConfirm).toHaveBeenCalledOnce();
    });

    it("Y calls onConfirm", () => {
      const props = makeProps();
      render(createElement(FolderDeleteConfirm, props));
      fireEvent.keyDown(document, { key: "Y" });
      expect(props.onConfirm).toHaveBeenCalledOnce();
    });

    it("Escape calls onCancel", () => {
      const props = makeProps();
      render(createElement(FolderDeleteConfirm, props));
      fireEvent.keyDown(document, { key: "Escape" });
      expect(props.onCancel).toHaveBeenCalledOnce();
    });

    it("other keys do not call onConfirm or onCancel", () => {
      const props = makeProps();
      render(createElement(FolderDeleteConfirm, props));
      fireEvent.keyDown(document, { key: "n" });
      expect(props.onConfirm).not.toHaveBeenCalled();
      expect(props.onCancel).not.toHaveBeenCalled();
    });
  });
});
