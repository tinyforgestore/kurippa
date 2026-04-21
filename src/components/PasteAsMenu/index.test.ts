import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { PasteAsMenu } from "@/components/PasteAsMenu/index";
import { ClipboardItem } from "@/types";
import { PasteOption } from "@/utils/pasteAs";

// Mock pasteAs utility so tests don't depend on its logic
const mockGetPasteOptions = vi.fn();
vi.mock("@/utils/pasteAs", () => ({
  getPasteOptions: (...args: unknown[]) => mockGetPasteOptions(...args),
}));

// Mock vanilla-extract styles
vi.mock("./index.css", () => ({
  menu: "menu",
  menuHeader: "menuHeader",
  menuHeaderEmphasis: "menuHeaderEmphasis",
  menuOption: "menuOption",
  menuOptionSelected: "menuOptionSelected",
  menuNumber: "menuNumber",
  menuArrow: "menuArrow",
  menuBack: "menuBack",
}));

function makeItem(overrides: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1,
    kind: "text",
    text: "hello world",
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
    ...overrides,
  };
}

function makeOption(label: string, text = label): PasteOption {
  return {
    label,
    action: { kind: "paste-text", text, itemId: null as unknown as number },
  };
}

function makeSubmenuOption(label: string, children: PasteOption[]): PasteOption {
  return { label, submenu: children };
}

const SUB_OPTIONS: PasteOption[] = [
  makeOption("Sub A", "subA"),
  makeOption("Sub B", "subB"),
];

const FIXED_OPTIONS: PasteOption[] = [
  makeOption("Option one", "one"),
  makeOption("Option two", "two"),
  makeSubmenuOption("Change case", SUB_OPTIONS),
  makeSubmenuOption("Wrap with\u2026", [makeOption("Wrap in double quotes", '"hello"')]),
  { label: "Trim whitespace", badge: "0", action: { kind: "paste-text", text: "hello world", itemId: null as unknown as number } },
];

function makeProps(overrides: Partial<Parameters<typeof PasteAsMenu>[0]> = {}) {
  return {
    item: makeItem(),
    onClose: vi.fn(),
    onSelect: vi.fn(),
    onCursorChange: vi.fn(),
    onOpenPreview: vi.fn(),
    ...overrides,
  };
}

describe("PasteAsMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPasteOptions.mockReturnValue(FIXED_OPTIONS);
  });

  describe("rendering", () => {
    it("renders header with item preview text", () => {
      const props = makeProps({ item: makeItem({ text: "hello world" }) });
      render(createElement(PasteAsMenu, props));
      expect(screen.getByText(/"hello world"/)).toBeTruthy();
    });

    it("truncates long item preview to 40 chars in header", () => {
      const longText = "a".repeat(50);
      const props = makeProps({ item: makeItem({ text: longText }) });
      render(createElement(PasteAsMenu, props));
      const truncated = "a".repeat(40) + "…";
      expect(screen.getByText(`"${truncated}"`)).toBeTruthy();
    });

    it("renders 5 top-level options", () => {
      const props = makeProps();
      const { container } = render(createElement(PasteAsMenu, props));
      const optionDivs = container.querySelectorAll(".menuOption");
      expect(optionDivs).toHaveLength(5);
    });

    it("renders all option labels", () => {
      const props = makeProps();
      render(createElement(PasteAsMenu, props));
      expect(screen.getByText("Option one")).toBeTruthy();
      expect(screen.getByText("Option two")).toBeTruthy();
      expect(screen.getByText("Change case")).toBeTruthy();
      expect(screen.getByText("Wrap with\u2026")).toBeTruthy();
      expect(screen.getByText("Trim whitespace")).toBeTruthy();
    });

    it("renders › arrow on submenu items", () => {
      const props = makeProps();
      render(createElement(PasteAsMenu, props));
      const arrows = screen.getAllByText("›");
      expect(arrows).toHaveLength(2); // Change case and Wrap with…
    });

    it("renders badge '0' for Trim whitespace (badge override)", () => {
      const props = makeProps();
      render(createElement(PasteAsMenu, props));
      expect(screen.getByText("0")).toBeTruthy();
    });

    it("applies selected class to first option by default", () => {
      const props = makeProps();
      const { container } = render(createElement(PasteAsMenu, props));
      const optionDivs = container.querySelectorAll(".menuOption");
      expect(optionDivs[0].className).toContain("menuOptionSelected");
      expect(optionDivs[1].className).not.toContain("menuOptionSelected");
    });
  });

  describe("keyboard navigation", () => {
    it("ArrowDown moves cursor to next option", () => {
      const props = makeProps();
      const { container } = render(createElement(PasteAsMenu, props));

      fireEvent.keyDown(document, { key: "ArrowDown" });

      const optionDivs = container.querySelectorAll(".menuOption");
      expect(optionDivs[1].className).toContain("menuOptionSelected");
      expect(optionDivs[0].className).not.toContain("menuOptionSelected");
    });

    it("ArrowDown does not go past last option", () => {
      const props = makeProps();
      const { container } = render(createElement(PasteAsMenu, props));

      for (let i = 0; i < 10; i++) {
        fireEvent.keyDown(document, { key: "ArrowDown" });
      }

      const optionDivs = container.querySelectorAll(".menuOption");
      expect(optionDivs[4].className).toContain("menuOptionSelected");
    });

    it("pressing 1 calls onSelect with first option", () => {
      const onSelect = vi.fn();
      const props = makeProps({ onSelect });
      render(createElement(PasteAsMenu, props));

      fireEvent.keyDown(document, { key: "1" });

      expect(onSelect).toHaveBeenCalledWith(FIXED_OPTIONS[0]);
    });

    it("pressing 3 enters submenu and renders submenu header", () => {
      const props = makeProps();
      const { container } = render(createElement(PasteAsMenu, props));

      fireEvent.keyDown(document, { key: "3" });

      expect(container.querySelector(".menuBack")).toBeTruthy();
      expect(screen.getByText(/← Change case/)).toBeTruthy();
    });

    it("pressing 3 then shows submenu options instead of top-level", () => {
      const props = makeProps();
      render(createElement(PasteAsMenu, props));

      fireEvent.keyDown(document, { key: "3" });

      expect(screen.getByText("Sub A")).toBeTruthy();
      expect(screen.getByText("Sub B")).toBeTruthy();
    });

    it("pressing Escape in submenu returns to top-level header", () => {
      const onClose = vi.fn();
      const props = makeProps({ onClose });
      render(createElement(PasteAsMenu, props));

      fireEvent.keyDown(document, { key: "3" });
      fireEvent.keyDown(document, { key: "Escape" });

      expect(screen.getByText(/"hello world"/)).toBeTruthy();
      expect(onClose).not.toHaveBeenCalled();
    });

    it("pressing Escape at level 1 calls onClose", () => {
      const onClose = vi.fn();
      const props = makeProps({ onClose });
      render(createElement(PasteAsMenu, props));

      fireEvent.keyDown(document, { key: "Escape" });

      expect(onClose).toHaveBeenCalledOnce();
    });

    it("pressing Enter calls onSelect with the currently cursored option", () => {
      const onSelect = vi.fn();
      const props = makeProps({ onSelect });
      render(createElement(PasteAsMenu, props));

      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "Enter" });

      expect(onSelect).toHaveBeenCalledWith(FIXED_OPTIONS[1]);
    });

    it("pressing a number out of range does not call onSelect", () => {
      const onSelect = vi.fn();
      const props = makeProps({ onSelect });
      render(createElement(PasteAsMenu, props));

      fireEvent.keyDown(document, { key: "9" });

      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe("mouse interactions", () => {
    it("mouse move on an option updates the cursor", () => {
      const props = makeProps();
      const { container } = render(createElement(PasteAsMenu, props));

      const optionDivs = container.querySelectorAll(".menuOption");
      fireEvent.mouseMove(optionDivs[1]);

      expect(optionDivs[1].className).toContain("menuOptionSelected");
      expect(optionDivs[0].className).not.toContain("menuOptionSelected");
    });

    it("clicking a plain option calls onSelect with that option", () => {
      const onSelect = vi.fn();
      const props = makeProps({ onSelect });
      const { container } = render(createElement(PasteAsMenu, props));

      const optionDivs = container.querySelectorAll(".menuOption");
      fireEvent.click(optionDivs[1]);

      expect(onSelect).toHaveBeenCalledWith(FIXED_OPTIONS[1]);
    });

    it("clicking the back header in submenu returns to top-level", () => {
      const onClose = vi.fn();
      const props = makeProps({ onClose });
      const { container } = render(createElement(PasteAsMenu, props));

      // Enter submenu via keyboard
      fireEvent.keyDown(document, { key: "3" });

      // Click the back header
      const backEl = container.querySelector(".menuBack");
      expect(backEl).toBeTruthy();
      fireEvent.click(backEl!);

      // Should be back to top-level header
      expect(screen.getByText(/"hello world"/)).toBeTruthy();
      expect(onClose).not.toHaveBeenCalled();
    });

    it("clicking a submenu item (opt.action present) calls onSelect", () => {
      const onSelect = vi.fn();
      const props = makeProps({ onSelect });
      const { container } = render(createElement(PasteAsMenu, props));

      // Enter the submenu by clicking the submenu option
      const optionDivs = container.querySelectorAll(".menuOption");
      // "Change case" is at index 2 in FIXED_OPTIONS — it is a submenu item
      fireEvent.click(optionDivs[2]);

      // Should now be in submenu — the sub options are rendered
      expect(screen.getByText("Sub A")).toBeTruthy();

      // Click first sub-option — it has an action, not a submenu, so onSelect should be called
      const subOptionDivs = container.querySelectorAll(".menuOption");
      fireEvent.click(subOptionDivs[0]);
      expect(onSelect).toHaveBeenCalledWith(SUB_OPTIONS[0]);
    });
  });
});
