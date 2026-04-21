import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { PinnedHeader } from "@/components/HistoryList/PinnedHeader";

vi.mock("@/components/HistoryList/index.css", () => ({
  pinnedHeader: "pinnedHeader",
  pinnedHeaderIcon: "pinnedHeaderIcon",
  pinnedHeaderLabel: "pinnedHeaderLabel",
  itemSelected: "itemSelected",
  shortcutHint: "shortcutHint",
}));

vi.mock("lucide-react", () => ({
  Pin: () => createElement("span", { "data-icon": "pin" }),
}));

function makeProps(overrides: Partial<Parameters<typeof PinnedHeader>[0]> = {}) {
  return {
    count: 3,
    selected: false,
    hint: null,
    multiSelectActive: false,
    onClick: vi.fn(),
    onMouseMove: vi.fn(),
    ...overrides,
  };
}

describe("PinnedHeader", () => {
  describe("rendering", () => {
    it("renders the pin icon", () => {
      const { container } = render(createElement(PinnedHeader, makeProps()));
      expect(container.querySelector("[data-icon='pin']")).toBeInTheDocument();
    });

    it("renders the count in the label", () => {
      render(createElement(PinnedHeader, makeProps({ count: 5 })));
      expect(screen.getByText("Pinned (5)")).toBeInTheDocument();
    });

    it("renders the shortcut hint when hint is provided and multiSelectActive is false", () => {
      render(createElement(PinnedHeader, makeProps({ hint: "⌘0", multiSelectActive: false })));
      expect(screen.getByText("⌘0")).toBeInTheDocument();
    });

    it("does not render the shortcut hint when hint is null", () => {
      const { container } = render(createElement(PinnedHeader, makeProps({ hint: null })));
      expect(container.querySelector(".shortcutHint")).toBeNull();
    });

    it("does not render the shortcut hint when multiSelectActive is true", () => {
      const { container } = render(createElement(PinnedHeader, makeProps({ hint: "⌘1", multiSelectActive: true })));
      expect(container.querySelector(".shortcutHint")).toBeNull();
    });

    it("applies itemSelected class when selected is true", () => {
      const { container } = render(createElement(PinnedHeader, makeProps({ selected: true })));
      expect(container.querySelector("[data-pinned-header]")?.className).toContain("itemSelected");
    });

    it("does not apply itemSelected class when selected is false", () => {
      const { container } = render(createElement(PinnedHeader, makeProps({ selected: false })));
      expect(container.querySelector("[data-pinned-header]")?.className).not.toContain("itemSelected");
    });
  });

  describe("interactions", () => {
    it("calls onClick when clicked", () => {
      const onClick = vi.fn();
      const { container } = render(createElement(PinnedHeader, makeProps({ onClick })));
      fireEvent.click(container.querySelector("[data-pinned-header]")!);
      expect(onClick).toHaveBeenCalledOnce();
    });

    it("calls onMouseMove on mouse move", () => {
      const onMouseMove = vi.fn();
      const { container } = render(createElement(PinnedHeader, makeProps({ onMouseMove })));
      fireEvent.mouseMove(container.querySelector("[data-pinned-header]")!);
      expect(onMouseMove).toHaveBeenCalledOnce();
    });
  });
});
