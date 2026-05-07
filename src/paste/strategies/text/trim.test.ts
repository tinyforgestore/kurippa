import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipboardItem } from "@/types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

import { trimSingleLineStrategy, trimMultiLineStrategy } from "@/paste/strategies/text/trim";

function entry(o: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "text", text: "  hi  ", html: null, rtf: null, image_path: null,
    source_app: null, created_at: 0, pinned: false, folder_id: null,
    qr_text: null, image_width: null, image_height: null, ...o,
  };
}

describe("trimSingleLineStrategy", () => {
  beforeEach(() => { mockInvoke.mockReset(); mockInvoke.mockResolvedValue(undefined); });

  it("badge is '0'", () => {
    expect(trimSingleLineStrategy.badge).toBe("0");
  });

  it("applicable for single-line", () => {
    expect(trimSingleLineStrategy.applicable!(entry({ text: "  hi  " }))).toBe(true);
    expect(trimSingleLineStrategy.applicable!(entry({ text: "a\nb" }))).toBe(false);
  });

  it("execute pastes trimmed text", () => {
    trimSingleLineStrategy.execute!(entry({ id: 1, text: "  hi  " }));
    expect(mockInvoke).toHaveBeenCalledWith("paste_item", {
      text: "hi", plainText: true, itemId: 1,
    });
  });
});

describe("trimMultiLineStrategy", () => {
  beforeEach(() => { mockInvoke.mockReset(); mockInvoke.mockResolvedValue(undefined); });

  it("applicable for multi-line", () => {
    expect(trimMultiLineStrategy.applicable!(entry({ text: "a\nb" }))).toBe(true);
    expect(trimMultiLineStrategy.applicable!(entry({ text: "ab" }))).toBe(false);
  });

  it("execute trims each line", () => {
    trimMultiLineStrategy.execute!(entry({ id: 2, text: "  a  \n  b  " }));
    expect(mockInvoke).toHaveBeenCalledWith("paste_item", {
      text: "a\nb", plainText: true, itemId: 2,
    });
  });
});
