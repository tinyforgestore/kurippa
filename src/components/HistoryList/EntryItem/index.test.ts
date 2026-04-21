import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { EntryItem } from "@/components/HistoryList/EntryItem/index";
import { FuzzyResult, ClipboardItem } from "@/types";

// Mock DOMPurify: strip anything that is not a <b> tag (mirrors ALLOWED_TAGS: ["b"])
vi.mock("dompurify", () => ({
  default: {
    sanitize: (html: string, options?: { ALLOWED_TAGS?: string[] }) => {
      const allowedTags = options?.ALLOWED_TAGS ?? [];
      // Strip all tags except those in allowedTags
      return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match, tag: string) => {
        return allowedTags.includes(tag.toLowerCase()) ? match : "";
      });
    },
  },
}));

// Mock vanilla-extract css modules (they return empty strings in test env)
vi.mock("../index.css", () => ({
  itemSelected: "itemSelected",
  shortcutHint: "shortcutHint",
  folderItemAccent: "folderItemAccent",
}));

vi.mock("./index.css", () => ({
  item: "item",
  itemScaled: "itemScaled",
  itemLanding: "itemLanding",
  itemLifting: "itemLifting",
  itemDeleting: "itemDeleting",
  itemText: "itemText",
  colorSwatch: "colorSwatch",
  itemDimmed: "itemDimmed",
  badgeOverlay: "badgeOverlay",
  flashPulse: "flashPulse",
  qrBadge: "qrBadge",
}));

function makeClipboardItem(overrides: Partial<ClipboardItem> = {}): ClipboardItem {
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

function makeFuzzyResult(overrides: Partial<FuzzyResult> = {}): FuzzyResult {
  return {
    item: makeClipboardItem(),
    highlighted: null,
    score: 1.0,
    folder_name: null,
    ...overrides,
  };
}

function makeProps(overrides: Partial<Parameters<typeof EntryItem>[0]> = {}) {
  return {
    result: makeFuzzyResult(),
    selected: false,
    hint: null,
    lifting: false,
    landing: false,
    deleting: false,
    onMove: vi.fn(),
    onClick: vi.fn(),
    ...overrides,
  };
}

describe("EntryItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("render states", () => {
    it("renders highlighted text when result.highlighted is set", () => {
      const props = makeProps({
        result: makeFuzzyResult({ highlighted: "he<b>ll</b>o" }),
      });
      const { container } = render(createElement(EntryItem, props));
      const span = container.querySelector("span.itemText");
      expect(span).toBeTruthy();
      // dangerouslySetInnerHTML is used, so innerHTML should contain the content
      expect(span?.innerHTML).toContain("he");
    });

    it("renders plain text via itemDisplayLabel when result.highlighted is null", () => {
      const props = makeProps({
        result: makeFuzzyResult({
          highlighted: null,
          item: makeClipboardItem({ text: "plain clipboard text" }),
        }),
      });
      render(createElement(EntryItem, props));
      expect(screen.getByText("plain clipboard text")).toBeTruthy();
    });

    it("renders shortcut hint when hint is not null", () => {
      const props = makeProps({ hint: "⌘1" });
      render(createElement(EntryItem, props));
      expect(screen.getByText("⌘1")).toBeTruthy();
    });

    it("does not render shortcut hint when hint is null", () => {
      const props = makeProps({ hint: null });
      const { container } = render(createElement(EntryItem, props));
      expect(container.querySelector(".shortcutHint")).toBeNull();
    });
  });

  describe("interactions", () => {
    it("calls onMove on mouseMove", () => {
      const onMove = vi.fn();
      const props = makeProps({ onMove });
      const { container } = render(createElement(EntryItem, props));
      const div = container.querySelector("[data-item]");
      expect(div).toBeTruthy();
      fireEvent.mouseMove(div!);
      expect(onMove).toHaveBeenCalledOnce();
    });

    it("calls onClick on click", () => {
      const onClick = vi.fn();
      const props = makeProps({ onClick });
      const { container } = render(createElement(EntryItem, props));
      const div = container.querySelector("[data-item]");
      expect(div).toBeTruthy();
      fireEvent.click(div!);
      expect(onClick).toHaveBeenCalledOnce();
    });
  });

  describe("deleting state", () => {
    it("applies itemDeleting class when deleting is true", () => {
      const props = makeProps({ deleting: true });
      const { container } = render(createElement(EntryItem, props));
      const div = container.querySelector("[data-item]");
      expect(div).toBeTruthy();
      expect(div?.className).toContain("itemDeleting");
    });
  });

  describe("DOMPurify sanitization", () => {
    it("strips <script> tags from highlighted content", () => {
      const props = makeProps({
        result: makeFuzzyResult({ highlighted: "foo<script>alert(1)</script>bar" }),
      });
      const { container } = render(createElement(EntryItem, props));
      const span = container.querySelector("span.itemText");
      expect(span?.innerHTML).not.toContain("<script>");
      expect(span?.innerHTML).toContain("foo");
      expect(span?.innerHTML).toContain("bar");
    });

    it("preserves <b> tags from highlighted content", () => {
      const props = makeProps({
        result: makeFuzzyResult({ highlighted: "he<b>ll</b>o" }),
      });
      const { container } = render(createElement(EntryItem, props));
      const span = container.querySelector("span.itemText");
      expect(span?.innerHTML).toContain("<b>ll</b>");
    });
  });
});
