import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { MultiSelectIndicator } from "@/components/MultiSelectIndicator/index";

vi.mock("./index.css", () => ({
  indicator: "indicator",
  label: "label",
  badges: "badges",
  hint: "hint",
  toast: "toast",
}));

function makeProps(overrides: Partial<Parameters<typeof MultiSelectIndicator>[0]> = {}) {
  return {
    selections: [],
    maxToastVisible: false,
    ...overrides,
  };
}

describe("MultiSelectIndicator", () => {
  describe("render states", () => {
    it("renders the Multi-select label", () => {
      render(createElement(MultiSelectIndicator, makeProps()));
      expect(screen.getByText("Multi-select")).toBeTruthy();
    });

    it("renders the keyboard hint", () => {
      render(createElement(MultiSelectIndicator, makeProps()));
      expect(screen.getByText(/Enter to merge/)).toBeTruthy();
    });

    it("does not render badge span when selections is empty", () => {
      const { container } = render(createElement(MultiSelectIndicator, makeProps()));
      expect(container.querySelector(".badges")).toBeNull();
    });

    it("renders badge characters for one selection", () => {
      render(createElement(MultiSelectIndicator, makeProps({ selections: [7] })));
      expect(screen.getByText("①")).toBeTruthy();
    });

    it("renders badge characters for three selections", () => {
      render(createElement(MultiSelectIndicator, makeProps({ selections: [1, 2, 3] })));
      expect(screen.getByText("①②③")).toBeTruthy();
    });

    it("renders badge characters for five selections", () => {
      render(createElement(MultiSelectIndicator, makeProps({ selections: [1, 2, 3, 4, 5] })));
      expect(screen.getByText("①②③④⑤")).toBeTruthy();
    });

    it("does not render toast when maxToastVisible is false", () => {
      const { container } = render(createElement(MultiSelectIndicator, makeProps({ maxToastVisible: false })));
      expect(container.querySelector(".toast")).toBeNull();
    });

    it("renders 'Max 5 items' toast when maxToastVisible is true", () => {
      render(createElement(MultiSelectIndicator, makeProps({ maxToastVisible: true })));
      expect(screen.getByText("Max 5 items")).toBeTruthy();
    });
  });
});
