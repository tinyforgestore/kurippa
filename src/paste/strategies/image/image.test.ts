import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipboardItem } from "@/types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

import { imagePasteStrategy } from "@/paste/strategies/image/image";

function entry(o: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "image", text: null, html: null, rtf: null, image_path: "1.png",
    source_app: null, created_at: 0, pinned: false, folder_id: null,
    qr_text: null, image_width: null, image_height: null, ...o,
  };
}

describe("imagePasteStrategy", () => {
  beforeEach(() => { mockInvoke.mockReset(); mockInvoke.mockResolvedValue(undefined); });

  it("preview returns null", () => {
    expect(imagePasteStrategy.preview!(entry())).toBeNull();
  });

  it("applicable when image_path is set", () => {
    expect(imagePasteStrategy.applicable!(entry({ image_path: "x.png" }))).toBe(true);
    expect(imagePasteStrategy.applicable!(entry({ image_path: null }))).toBe(false);
  });

  it("execute invokes paste_image_item", () => {
    imagePasteStrategy.execute!(entry({ id: 42, image_path: "42.png" }));
    expect(mockInvoke).toHaveBeenCalledWith("paste_image_item", {
      imageFilename: "42.png", itemId: 42,
    });
  });
});
