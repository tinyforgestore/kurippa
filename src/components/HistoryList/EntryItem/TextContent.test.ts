import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { TextContent } from "@/components/HistoryList/EntryItem/TextContent";
import { ClipboardItem } from "@/types";

vi.mock("@/components/HistoryList/EntryItem/index.css", () => ({
  itemText: "itemText",
  colorSwatch: "colorSwatch",
}));

function makeItem(overrides: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "text", text: "hello world", html: null, rtf: null,
    image_path: null, source_app: null, created_at: 1000,
    pinned: false, folder_id: null, qr_text: null,
    image_width: null, image_height: null,
    ...overrides,
  };
}

describe("TextContent", () => {
  it("renders the item text", () => {
    render(createElement(TextContent, { item: makeItem({ text: "clipboard text" }) }));
    expect(screen.getByText("clipboard text")).toBeInTheDocument();
  });

  it("renders a color swatch for a hex color value", () => {
    const { container } = render(createElement(TextContent, { item: makeItem({ text: "#ff0000" }) }));
    expect(container.querySelector(".colorSwatch")).toBeInTheDocument();
  });

  it("does not render a color swatch for non-color text", () => {
    const { container } = render(createElement(TextContent, { item: makeItem({ text: "plain text" }) }));
    expect(container.querySelector(".colorSwatch")).toBeNull();
  });

  it("renders inside a span with class itemText", () => {
    const { container } = render(createElement(TextContent, { item: makeItem() }));
    expect(container.querySelector("span.itemText")).toBeInTheDocument();
  });

  it("truncates long text at 500 characters", () => {
    const longText = "a".repeat(600);
    render(createElement(TextContent, { item: makeItem({ text: longText }) }));
    // itemDisplayLabel truncates at PREVIEW_TRUNCATE=500; rendered text should not be 600 chars
    const span = document.querySelector("span.itemText");
    expect((span?.textContent?.length ?? 0)).toBeLessThanOrEqual(504); // 500 + possible ellipsis
  });
});
