import { describe, it, expect } from "vitest";
import { formatAppName, formatSize, itemDisplayLabel, truncateMiddle } from "@/utils/format";
import type { ClipboardItem } from "@/types";

function makeItem(overrides: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "text", text: null, html: null, rtf: null,
    image_path: null, source_app: null, created_at: 1000,
    pinned: false, folder_id: null, qr_text: null,
    image_width: null, image_height: null,
    ...overrides,
  };
}

describe("truncateMiddle", () => {
  it("returns unchanged when length is less than maxLen", () => {
    expect(truncateMiddle("short.txt", 20)).toBe("short.txt");
  });

  it("returns unchanged when length exactly equals maxLen", () => {
    expect(truncateMiddle("exactly.txt", 11)).toBe("exactly.txt");
  });

  it("truncates middle with ellipsis for a string without extension", () => {
    const result = truncateMiddle("abcdefghijklmnopqrstuvwxyz", 10);
    expect(result).toContain("…");
    expect(result.length).toBeLessThanOrEqual(11);
  });

  it("truncates stem middle while preserving extension for long filename", () => {
    const result = truncateMiddle("averylongfilename.png", 15);
    expect(result).toContain("…");
    expect(result).toContain(".png");
  });

  it("handles edge case where extension alone nearly fills the budget (budget <= 2 fallback)", () => {
    const result = truncateMiddle("ab.verylongextension", 5);
    expect(result).toContain("…");
    expect(result.length).toBeLessThanOrEqual(5);
  });
});

describe("formatAppName", () => {
  it("extracts last segment and capitalises", () => {
    expect(formatAppName("com.apple.finder")).toBe("Finder");
  });

  it("handles single-segment bundle ID", () => {
    expect(formatAppName("Safari")).toBe("Safari");
  });

  it("handles capitalised last segment", () => {
    expect(formatAppName("com.google.Chrome")).toBe("Chrome");
  });

  it("returns empty string for empty input", () => {
    expect(formatAppName("")).toBe("");
  });

  it("preserves capitalisation of rest of the word", () => {
    expect(formatAppName("com.apple.Safari")).toBe("Safari");
  });
});

describe("formatSize", () => {
  it('returns "<1 kb" for empty string', () => {
    expect(formatSize("")).toBe("<1 kb");
  });

  it('returns "<1 kb" for short text', () => {
    expect(formatSize("hello")).toBe("<1 kb");
  });

  it("returns correct kb for text over 1 kb", () => {
    const text = "a".repeat(2048);
    expect(formatSize(text)).toBe("2.0 kb");
  });

  it("handles multi-byte characters", () => {
    // Each Japanese character is 3 UTF-8 bytes; 342 chars * 3 = 1026 bytes → ~1.0 kb
    const text = "あ".repeat(342);
    expect(formatSize(text)).toBe("1.0 kb");
  });
});

describe("itemDisplayLabel", () => {
  it("returns the item text when present", () => {
    expect(itemDisplayLabel(makeItem({ text: "hello world" }))).toBe("hello world");
  });

  it("truncates text and appends ellipsis when text exceeds maxChars", () => {
    expect(itemDisplayLabel(makeItem({ text: "abcdef" }), 4)).toBe("abcd…");
  });

  it("does not truncate when text length equals maxChars", () => {
    expect(itemDisplayLabel(makeItem({ text: "abcd" }), 4)).toBe("abcd");
  });

  it("does not truncate when text length is below maxChars", () => {
    expect(itemDisplayLabel(makeItem({ text: "abc" }), 4)).toBe("abc");
  });

  it("returns '[image]' when text is null and image_path is set", () => {
    expect(itemDisplayLabel(makeItem({ text: null, image_path: "screenshot.png" }))).toBe("[image]");
  });

  it("returns '[kind]' when text is null and image_path is null", () => {
    expect(itemDisplayLabel(makeItem({ kind: "rtf", text: null, image_path: null }))).toBe("[rtf]");
  });

  it("does not truncate when maxChars is undefined", () => {
    const longText = "a".repeat(1000);
    expect(itemDisplayLabel(makeItem({ text: longText }), undefined)).toBe(longText);
  });
});
