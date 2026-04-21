import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { FolderNameInput } from "@/components/FolderNameInput/index";

vi.mock("./index.css", () => ({
  container: "container",
  input: "input",
}));

function makeProps(overrides: Partial<Parameters<typeof FolderNameInput>[0]> = {}) {
  return {
    value: "",
    onChange: vi.fn(),
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe("FolderNameInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("render states", () => {
    it("renders an input element", () => {
      render(createElement(FolderNameInput, makeProps()));
      expect(screen.getByRole("textbox")).toBeTruthy();
    });

    it("renders with default placeholder 'Folder name'", () => {
      render(createElement(FolderNameInput, makeProps()));
      expect(screen.getByPlaceholderText("Folder name")).toBeTruthy();
    });

    it("renders with custom placeholder", () => {
      render(createElement(FolderNameInput, makeProps({ placeholder: "Rename folder" })));
      expect(screen.getByPlaceholderText("Rename folder")).toBeTruthy();
    });

    it("renders the current value", () => {
      render(createElement(FolderNameInput, makeProps({ value: "My folder" })));
      expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("My folder");
    });
  });

  describe("interactions", () => {
    it("calls onChange when the input changes", () => {
      const props = makeProps();
      render(createElement(FolderNameInput, props));
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "abc" } });
      expect(props.onChange).toHaveBeenCalledWith("abc");
    });

    it("slices input value to FOLDER_NAME_MAX_LENGTH (30 chars)", () => {
      const props = makeProps();
      render(createElement(FolderNameInput, props));
      const longValue = "a".repeat(40);
      fireEvent.change(screen.getByRole("textbox"), { target: { value: longValue } });
      expect(props.onChange).toHaveBeenCalledWith("a".repeat(30));
    });

    it("Enter calls onConfirm", () => {
      const props = makeProps();
      render(createElement(FolderNameInput, props));
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
      expect(props.onConfirm).toHaveBeenCalledOnce();
    });

    it("Escape calls onCancel", () => {
      const props = makeProps();
      render(createElement(FolderNameInput, props));
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
      expect(props.onCancel).toHaveBeenCalledOnce();
    });

    it("other keys do not call onConfirm or onCancel", () => {
      const props = makeProps();
      render(createElement(FolderNameInput, props));
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "a" });
      expect(props.onConfirm).not.toHaveBeenCalled();
      expect(props.onCancel).not.toHaveBeenCalled();
    });

    it("keyDown stops propagation", () => {
      const outerHandler = vi.fn();
      document.addEventListener("keydown", outerHandler);
      const props = makeProps();
      render(createElement(FolderNameInput, props));
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
      expect(outerHandler).not.toHaveBeenCalled();
      document.removeEventListener("keydown", outerHandler);
    });
  });
});
