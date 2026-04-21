import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { HighlightedContent } from "@/components/HistoryList/EntryItem/HighlightedContent";
import { FuzzyResult, ClipboardItem } from "@/types";

vi.mock("dompurify", () => ({
  default: {
    sanitize: (html: string, options?: { ALLOWED_TAGS?: string[] }) => {
      const allowed = options?.ALLOWED_TAGS ?? [];
      return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match, tag: string) =>
        allowed.includes(tag.toLowerCase()) ? match : ""
      );
    },
  },
}));

vi.mock("@/components/HistoryList/EntryItem/index.css", () => ({
  itemText: "itemText",
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

function makeResult(highlighted: string): FuzzyResult {
  return { item: makeItem(), highlighted, score: 1, folder_name: null };
}

describe("HighlightedContent", () => {
  it("renders a span with class itemText", () => {
    const { container } = render(createElement(HighlightedContent, { result: makeResult("hello") }));
    expect(container.querySelector("span.itemText")).toBeInTheDocument();
  });

  it("renders the highlighted text content", () => {
    const { container } = render(createElement(HighlightedContent, { result: makeResult("hello world") }));
    expect(container.querySelector("span.itemText")?.textContent).toContain("hello world");
  });

  it("preserves <b> tags in highlighted content", () => {
    const { container } = render(createElement(HighlightedContent, { result: makeResult("he<b>ll</b>o") }));
    expect(container.querySelector("span.itemText")?.innerHTML).toContain("<b>ll</b>");
  });

  it("strips <script> tags from highlighted content", () => {
    const { container } = render(createElement(HighlightedContent, { result: makeResult("foo<script>alert(1)</script>bar") }));
    const html = container.querySelector("span.itemText")?.innerHTML ?? "";
    expect(html).not.toContain("<script>");
    expect(html).toContain("foo");
    expect(html).toContain("bar");
  });
});
