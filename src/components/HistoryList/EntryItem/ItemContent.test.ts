import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { ItemContent } from "@/components/HistoryList/EntryItem/ItemContent";
import { FuzzyResult, ClipboardItem } from "@/types";

vi.mock("./HighlightedContent", () => ({
  HighlightedContent: () => createElement("div", { "data-content": "highlighted" }),
}));
vi.mock("./ImageContent", () => ({
  ImageContent: () => createElement("div", { "data-content": "image" }),
}));
vi.mock("./TextContent", () => ({
  TextContent: () => createElement("div", { "data-content": "text" }),
}));

function makeItem(overrides: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "text", text: "hello", html: null, rtf: null,
    image_path: null, source_app: null, created_at: 1000,
    pinned: false, folder_id: null, qr_text: null,
    image_width: null, image_height: null,
    ...overrides,
  };
}

function makeResult(overrides: Partial<FuzzyResult> = {}): FuzzyResult {
  return { item: makeItem(), highlighted: null, score: 1, folder_name: null, ...overrides };
}

describe("ItemContent", () => {
  it("renders HighlightedContent when result.highlighted is set", () => {
    const { container } = render(createElement(ItemContent, { result: makeResult({ highlighted: "he<b>ll</b>o" }) }));
    expect(container.querySelector("[data-content='highlighted']")).toBeInTheDocument();
  });

  it("renders ImageContent for image kind", () => {
    const { container } = render(createElement(ItemContent, { result: makeResult({ item: makeItem({ kind: "image" }) }) }));
    expect(container.querySelector("[data-content='image']")).toBeInTheDocument();
  });

  it("renders TextContent for text kind", () => {
    const { container } = render(createElement(ItemContent, { result: makeResult({ item: makeItem({ kind: "text" }) }) }));
    expect(container.querySelector("[data-content='text']")).toBeInTheDocument();
  });

  it("renders TextContent for rtf kind", () => {
    const { container } = render(createElement(ItemContent, { result: makeResult({ item: makeItem({ kind: "rtf" }) }) }));
    expect(container.querySelector("[data-content='text']")).toBeInTheDocument();
  });

  it("prefers HighlightedContent over kind routing when highlighted is set on an image item", () => {
    const { container } = render(
      createElement(ItemContent, { result: makeResult({ highlighted: "match", item: makeItem({ kind: "image" }) }) })
    );
    expect(container.querySelector("[data-content='highlighted']")).toBeInTheDocument();
    expect(container.querySelector("[data-content='image']")).toBeNull();
  });
});
