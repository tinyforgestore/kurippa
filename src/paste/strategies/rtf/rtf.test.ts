import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipboardItem } from "@/types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

import { richRtfStrategy } from "@/paste/strategies/rtf/rich";
import { plainRtfStrategy } from "@/paste/strategies/rtf/plain";

function entry(o: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "rtf", text: "hello", html: null, rtf: null, image_path: null,
    source_app: null, created_at: 0, pinned: false, folder_id: null,
    qr_text: null, image_width: null, image_height: null, ...o,
  };
}

describe("rtf strategies", () => {
  beforeEach(() => { mockInvoke.mockReset(); mockInvoke.mockResolvedValue(undefined); });

  it("rich uses plainText=false", () => {
    richRtfStrategy.execute!(entry({ id: 7, text: "hi" }));
    expect(mockInvoke).toHaveBeenCalledWith("paste_item", { text: "hi", plainText: false, itemId: 7 });
  });

  it("plain uses plainText=true", () => {
    plainRtfStrategy.execute!(entry({ id: 7, text: "hi" }));
    expect(mockInvoke).toHaveBeenCalledWith("paste_item", { text: "hi", plainText: true, itemId: 7 });
  });

  it("labels", () => {
    expect(richRtfStrategy.label).toBe("Paste as rich text");
    expect(plainRtfStrategy.label).toBe("Paste as plain text");
  });
});
