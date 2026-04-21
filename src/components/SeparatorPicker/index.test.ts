import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { SeparatorPicker } from "@/components/SeparatorPicker/index";

vi.mock("./index.css", () => ({
  menu: "menu",
  menuHeader: "menuHeader",
  menuOption: "menuOption",
  menuOptionSelected: "menuOptionSelected",
  menuNumber: "menuNumber",
}));

function makeProps(overrides: Partial<Parameters<typeof SeparatorPicker>[0]> = {}) {
  return {
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    defaultSeparator: "newline" as const,
    ...overrides,
  };
}

describe("SeparatorPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("render states", () => {
    it("renders 3 separator options", () => {
      const props = makeProps();
      render(createElement(SeparatorPicker, props));
      expect(screen.getByText(/Newline/)).toBeTruthy();
      expect(screen.getByText(/Space/)).toBeTruthy();
      expect(screen.getByText(/Comma/)).toBeTruthy();
    });

    it("renders a header", () => {
      const props = makeProps();
      render(createElement(SeparatorPicker, props));
      expect(screen.getByText(/Choose separator/)).toBeTruthy();
    });

    it("renders number labels 1, 2, 3", () => {
      const props = makeProps();
      render(createElement(SeparatorPicker, props));
      expect(screen.getByText("1")).toBeTruthy();
      expect(screen.getByText("2")).toBeTruthy();
      expect(screen.getByText("3")).toBeTruthy();
    });

    it("pre-selects newline by default", () => {
      const props = makeProps({ defaultSeparator: "newline" });
      const { container } = render(createElement(SeparatorPicker, props));
      const selected = container.querySelector(".menuOptionSelected");
      expect(selected?.textContent).toContain("Newline");
    });

    it("pre-selects space when defaultSeparator is space", () => {
      const props = makeProps({ defaultSeparator: "space" });
      const { container } = render(createElement(SeparatorPicker, props));
      const selected = container.querySelector(".menuOptionSelected");
      expect(selected?.textContent).toContain("Space");
    });

    it("pre-selects comma when defaultSeparator is comma", () => {
      const props = makeProps({ defaultSeparator: "comma" });
      const { container } = render(createElement(SeparatorPicker, props));
      const selected = container.querySelector(".menuOptionSelected");
      expect(selected?.textContent).toContain("Comma");
    });
  });

  describe("keyboard interactions", () => {
    it("calls onCancel on Escape", () => {
      const props = makeProps();
      render(createElement(SeparatorPicker, props));
      fireEvent.keyDown(document, { key: "Escape" });
      expect(props.onCancel).toHaveBeenCalledOnce();
    });

    it("calls onCancel on ArrowLeft", () => {
      const props = makeProps();
      render(createElement(SeparatorPicker, props));
      fireEvent.keyDown(document, { key: "ArrowLeft" });
      expect(props.onCancel).toHaveBeenCalledOnce();
    });

    it("calls onConfirm with newline when key 1 is pressed", () => {
      const props = makeProps();
      render(createElement(SeparatorPicker, props));
      fireEvent.keyDown(document, { key: "1" });
      expect(props.onConfirm).toHaveBeenCalledWith("newline");
    });

    it("calls onConfirm with space when key 2 is pressed", () => {
      const props = makeProps();
      render(createElement(SeparatorPicker, props));
      fireEvent.keyDown(document, { key: "2" });
      expect(props.onConfirm).toHaveBeenCalledWith("space");
    });

    it("calls onConfirm with comma when key 3 is pressed", () => {
      const props = makeProps();
      render(createElement(SeparatorPicker, props));
      fireEvent.keyDown(document, { key: "3" });
      expect(props.onConfirm).toHaveBeenCalledWith("comma");
    });

    it("calls onConfirm with selected option on Enter", () => {
      const props = makeProps({ defaultSeparator: "space" });
      render(createElement(SeparatorPicker, props));
      fireEvent.keyDown(document, { key: "Enter" });
      expect(props.onConfirm).toHaveBeenCalledWith("space");
    });

    it("navigates down with ArrowDown and confirms with Enter", () => {
      const props = makeProps({ defaultSeparator: "newline" });
      render(createElement(SeparatorPicker, props));
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "Enter" });
      expect(props.onConfirm).toHaveBeenCalledWith("space");
    });

    it("navigates up with ArrowUp", () => {
      const props = makeProps({ defaultSeparator: "comma" });
      render(createElement(SeparatorPicker, props));
      fireEvent.keyDown(document, { key: "ArrowUp" });
      fireEvent.keyDown(document, { key: "Enter" });
      expect(props.onConfirm).toHaveBeenCalledWith("space");
    });

    it("clamps cursor at 0 (ArrowUp from first item)", () => {
      const props = makeProps({ defaultSeparator: "newline" });
      render(createElement(SeparatorPicker, props));
      fireEvent.keyDown(document, { key: "ArrowUp" });
      fireEvent.keyDown(document, { key: "Enter" });
      expect(props.onConfirm).toHaveBeenCalledWith("newline");
    });

    it("clamps cursor at last item (ArrowDown from last item)", () => {
      const props = makeProps({ defaultSeparator: "comma" });
      render(createElement(SeparatorPicker, props));
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "Enter" });
      expect(props.onConfirm).toHaveBeenCalledWith("comma");
    });
  });

  describe("mouse interactions", () => {
    it("calls onConfirm when an option is clicked", () => {
      const props = makeProps();
      render(createElement(SeparatorPicker, props));
      const spaceOption = screen.getByText(/Space/).closest(".menuOption");
      expect(spaceOption).toBeTruthy();
      fireEvent.click(spaceOption!);
      expect(props.onConfirm).toHaveBeenCalledWith("space");
    });
  });
});
