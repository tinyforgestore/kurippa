import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipboardItem } from "@/types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

import { imageFilenameStrategy } from "@/paste/strategies/image/filename";

function entry(o: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "image", text: "/Users/x/photo.jpg", html: null, rtf: null, image_path: "1.png",
    source_app: null, created_at: 0, pinned: false, folder_id: null,
    qr_text: null, image_width: null, image_height: null, ...o,
  };
}

describe("imageFilenameStrategy", () => {
  beforeEach(() => { mockInvoke.mockReset(); mockInvoke.mockResolvedValue(undefined); });

  it("dynamic label is filename", () => {
    expect((imageFilenameStrategy.label as (e: ClipboardItem) => string)(entry()))
      .toBe("Paste as filename  photo.jpg");
  });

  it("applicable when text is present", () => {
    expect(imageFilenameStrategy.applicable!(entry({ text: null }))).toBe(false);
    expect(imageFilenameStrategy.applicable!(entry({ text: "x" }))).toBe(true);
  });

  it("execute pastes filename only", () => {
    imageFilenameStrategy.execute!(entry({ id: 6, text: "/a/b/c.png" }));
    expect(mockInvoke).toHaveBeenCalledWith("paste_item", {
      text: "c.png", plainText: true, itemId: 6,
    });
  });
});
