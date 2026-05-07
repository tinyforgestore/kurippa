import { describe, it, expect } from "vitest";
import { detectEntry } from "@/entries";
import { ClipboardItem } from "@/types";

function makeEntry(overrides: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1,
    kind: "text",
    text: "hello",
    html: null,
    rtf: null,
    image_path: null,
    source_app: null,
    created_at: 0,
    pinned: false,
    folder_id: null,
    qr_text: null,
    image_width: null,
    image_height: null,
    ...overrides,
  };
}

describe("detectEntry", () => {
  it("detects image entries by kind", () => {
    expect(detectEntry(makeEntry({ kind: "image", text: null }))).toBe("image");
  });

  it("detects URL text", () => {
    expect(detectEntry(makeEntry({ text: "https://example.com" }))).toBe("url");
  });

  it("URL beats text kind", () => {
    expect(detectEntry(makeEntry({ kind: "text", text: "https://x.com/y" }))).toBe("url");
  });

  it("detects color hex", () => {
    expect(detectEntry(makeEntry({ text: "#ff6600" }))).toBe("color");
  });

  it("rtf kind with non-url, non-color text", () => {
    expect(detectEntry(makeEntry({ kind: "rtf", text: "hello" }))).toBe("rtf");
  });

  it("detects unix file path", () => {
    expect(detectEntry(makeEntry({ text: "/Users/x/y.txt" }))).toBe("file-path");
  });

  it("detects home file path", () => {
    expect(detectEntry(makeEntry({ text: "~/file.txt" }))).toBe("file-path");
  });

  it("detects windows file path", () => {
    expect(detectEntry(makeEntry({ text: "C:\\Users\\x\\f.txt" }))).toBe("file-path");
  });

  it("falls through to text", () => {
    expect(detectEntry(makeEntry({ text: "hello world" }))).toBe("text");
  });

  it("empty text falls through to text", () => {
    expect(detectEntry(makeEntry({ text: "" }))).toBe("text");
  });

  it("image with text URL is still image", () => {
    expect(detectEntry(makeEntry({ kind: "image", text: "https://example.com" }))).toBe("image");
  });
});
