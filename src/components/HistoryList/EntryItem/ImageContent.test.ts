import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { ImageContent } from "@/components/HistoryList/EntryItem/ImageContent";
import { ClipboardItem } from "@/types";

vi.mock("lucide-react", () => ({
  Image: () => createElement("span", { "data-icon": "image" }),
}));

vi.mock("@/components/HistoryList/EntryItem/index.css", () => ({
  itemText: "itemText",
}));

vi.mock("@/utils/format", () => ({
  truncateMiddle: vi.fn((s: string) => s + "-truncated"),
}));

vi.mock("@/utils/time", () => ({
  formatRelativeTime: vi.fn(() => "2 mins ago"),
}));

function makeItem(overrides: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "image", text: null, html: null, rtf: null,
    image_path: "/tmp/img.png", source_app: null, created_at: 1000,
    pinned: false, folder_id: null, qr_text: null,
    image_width: null, image_height: null,
    ...overrides,
  };
}

describe("ImageContent", () => {
  it("renders the image icon", () => {
    const { container } = render(createElement(ImageContent, { item: makeItem() }));
    expect(container.querySelector("[data-icon='image']")).toBeInTheDocument();
  });

  it("shows filename when item.text has a path", () => {
    render(createElement(ImageContent, { item: makeItem({ text: "/Users/foo/logo.png" }) }));
    expect(screen.getByText(/logo\.png-truncated/)).toBeInTheDocument();
  });

  it("shows timestamp-based label when item.text is null", () => {
    render(createElement(ImageContent, { item: makeItem({ text: null }) }));
    expect(screen.getByText(/copied 2 mins ago/)).toBeInTheDocument();
  });

  it("appends dimensions when width and height are present", () => {
    render(createElement(ImageContent, { item: makeItem({ text: null, image_width: 1440, image_height: 900 }) }));
    expect(screen.getByText(/· 1440×900/)).toBeInTheDocument();
  });

  it("omits dimensions when image_width is null", () => {
    const { container } = render(createElement(ImageContent, { item: makeItem({ text: null, image_width: null, image_height: null }) }));
    expect(container.textContent).not.toContain("×");
  });

  it("title attribute contains full timestamp", () => {
    const { container } = render(createElement(ImageContent, { item: makeItem() }));
    const span = container.querySelector("span.itemText");
    expect(span?.getAttribute("title")).toBeTruthy();
  });
});
