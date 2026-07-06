import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { MultiSelectActionMenu } from "@/components/MultiSelectActionMenu/index";

vi.mock("./index.css", () => ({
  container: "container",
  title: "title",
  option: "option",
  optionKey: "optionKey",
  buttonHighlighted: "buttonHighlighted",
  hint: "hint",
}));

function makeProps(overrides: Partial<Parameters<typeof MultiSelectActionMenu>[0]> = {}) {
  return {
    count: 3,
    onMerge: vi.fn(),
    onPinAll: vi.fn(),
    onMoveToFolder: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe("MultiSelectActionMenu", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("render states", () => {
    it("renders the three options", () => {
      render(createElement(MultiSelectActionMenu, makeProps()));
      expect(screen.getByText("Merge and paste")).toBeTruthy();
      expect(screen.getByText("Pin all")).toBeTruthy();
      expect(screen.getByText("Move to folder")).toBeTruthy();
    });

    it("renders the plural count", () => {
      render(createElement(MultiSelectActionMenu, makeProps({ count: 3 })));
      expect(screen.getByText("3 items selected")).toBeTruthy();
    });

    it("renders the singular count", () => {
      render(createElement(MultiSelectActionMenu, makeProps({ count: 1 })));
      expect(screen.getByText("1 item selected")).toBeTruthy();
    });

    it("renders the keyboard hint", () => {
      render(createElement(MultiSelectActionMenu, makeProps()));
      expect(screen.getByText(/to choose/)).toBeTruthy();
      expect(screen.getByText(/Enter to select/)).toBeTruthy();
      expect(screen.getByText(/Esc to cancel/)).toBeTruthy();
    });
  });

  describe("highlight state", () => {
    it("highlights merge by default", () => {
      render(createElement(MultiSelectActionMenu, makeProps()));
      const merge = screen.getByText("Merge and paste");
      expect(merge.className).toContain("buttonHighlighted");
    });

    it("mouseMove syncs highlight to the hovered option", () => {
      render(createElement(MultiSelectActionMenu, makeProps()));
      const pin = screen.getByText("Pin all");
      fireEvent.mouseMove(pin);
      expect(pin.className).toContain("buttonHighlighted");
      expect(screen.getByText("Merge and paste").className).not.toContain("buttonHighlighted");
    });
  });

  describe("interactions", () => {
    it("clicking Merge and paste fires onMerge", () => {
      const onMerge = vi.fn();
      render(createElement(MultiSelectActionMenu, makeProps({ onMerge })));
      fireEvent.click(screen.getByText("Merge and paste"));
      expect(onMerge).toHaveBeenCalledOnce();
    });

    it("clicking Pin all fires onPinAll", () => {
      const onPinAll = vi.fn();
      render(createElement(MultiSelectActionMenu, makeProps({ onPinAll })));
      fireEvent.click(screen.getByText("Pin all"));
      expect(onPinAll).toHaveBeenCalledOnce();
    });

    it("clicking Move to folder fires onMoveToFolder", () => {
      const onMoveToFolder = vi.fn();
      render(createElement(MultiSelectActionMenu, makeProps({ onMoveToFolder })));
      fireEvent.click(screen.getByText("Move to folder"));
      expect(onMoveToFolder).toHaveBeenCalledOnce();
    });
  });
});
