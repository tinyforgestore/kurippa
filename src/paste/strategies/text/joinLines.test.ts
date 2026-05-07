import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipboardItem } from "@/types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

import { joinLinesStrategy } from "@/paste/strategies/text/joinLines";

function entry(o: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "text", text: "a\nb", html: null, rtf: null, image_path: null,
    source_app: null, created_at: 0, pinned: false, folder_id: null,
    qr_text: null, image_width: null, image_height: null, ...o,
  };
}

describe("joinLinesStrategy", () => {
  beforeEach(() => { mockInvoke.mockReset(); mockInvoke.mockResolvedValue(undefined); });

  it("applicable only multi-line", () => {
    expect(joinLinesStrategy.applicable!(entry({ text: "ab" }))).toBe(false);
    expect(joinLinesStrategy.applicable!(entry({ text: "a\nb" }))).toBe(true);
  });

  it("joins lines with single space", () => {
    joinLinesStrategy.execute!(entry({ id: 4, text: "a\nb\nc" }));
    expect(mockInvoke).toHaveBeenCalledWith("paste_item", {
      text: "a b c", plainText: true, itemId: 4,
    });
  });
});
