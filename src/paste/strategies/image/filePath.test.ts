import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipboardItem } from "@/types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

import { imageFilePathStrategy } from "@/paste/strategies/image/filePath";

function entry(o: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "image", text: "/Users/x/img.png", html: null, rtf: null, image_path: "1.png",
    source_app: null, created_at: 0, pinned: false, folder_id: null,
    qr_text: null, image_width: null, image_height: null, ...o,
  };
}

describe("imageFilePathStrategy", () => {
  beforeEach(() => { mockInvoke.mockReset(); mockInvoke.mockResolvedValue(undefined); });

  it("applicable when text is present", () => {
    expect(imageFilePathStrategy.applicable!(entry({ text: "x" }))).toBe(true);
    expect(imageFilePathStrategy.applicable!(entry({ text: null }))).toBe(false);
  });

  it("preview returns text", () => {
    expect(imageFilePathStrategy.preview!(entry({ text: "/a/b" }))).toBe("/a/b");
  });

  it("execute pastes text", () => {
    imageFilePathStrategy.execute!(entry({ id: 5, text: "/p" }));
    expect(mockInvoke).toHaveBeenCalledWith("paste_item", {
      text: "/p", plainText: true, itemId: 5,
    });
  });
});
