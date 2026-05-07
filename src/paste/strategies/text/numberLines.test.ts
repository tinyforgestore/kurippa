import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipboardItem } from "@/types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

import { numberLinesStrategy } from "@/paste/strategies/text/numberLines";

function entry(o: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "text", text: "a\nb", html: null, rtf: null, image_path: null,
    source_app: null, created_at: 0, pinned: false, folder_id: null,
    qr_text: null, image_width: null, image_height: null, ...o,
  };
}

describe("numberLinesStrategy", () => {
  beforeEach(() => { mockInvoke.mockReset(); mockInvoke.mockResolvedValue(undefined); });

  it("applicable only multi-line", () => {
    expect(numberLinesStrategy.applicable!(entry({ text: "ab" }))).toBe(false);
    expect(numberLinesStrategy.applicable!(entry({ text: "a\nb" }))).toBe(true);
  });

  it("numbers each line", () => {
    numberLinesStrategy.execute!(entry({ id: 8, text: "a\nb" }));
    expect(mockInvoke).toHaveBeenCalledWith("paste_item", {
      text: "1. a\n2. b", plainText: true, itemId: 8,
    });
  });
});
