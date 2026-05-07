import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipboardItem } from "@/types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

import { wrapStrategy } from "@/paste/strategies/text/wrap";

function entry(o: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "text", text: "hi", html: null, rtf: null, image_path: null,
    source_app: null, created_at: 0, pinned: false, folder_id: null,
    qr_text: null, image_width: null, image_height: null, ...o,
  };
}

describe("wrapStrategy", () => {
  beforeEach(() => { mockInvoke.mockReset(); mockInvoke.mockResolvedValue(undefined); });

  it("label uses ellipsis", () => {
    expect(wrapStrategy.label).toBe("Wrap with…");
  });

  it("applicable false when newline present", () => {
    expect(wrapStrategy.applicable!(entry({ text: "a\nb" }))).toBe(false);
  });

  it("has 6 children with shortcutKeys", () => {
    expect(wrapStrategy.children).toHaveLength(6);
    expect(wrapStrategy.children!.map((c) => c.shortcutKey)).toEqual([
      '"', "'", "`", "(", "[", "{",
    ]);
  });

  it("double-quote child wraps text and pastes", () => {
    const dq = wrapStrategy.children![0];
    dq.execute!(entry({ id: 9, text: "hi" }));
    expect(mockInvoke).toHaveBeenCalledWith("paste_item", {
      text: '"hi"', plainText: true, itemId: 9,
    });
  });
});
