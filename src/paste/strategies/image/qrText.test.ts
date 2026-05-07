import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipboardItem } from "@/types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

import { imageQrTextStrategy } from "@/paste/strategies/image/qrText";

function entry(o: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "image", text: null, html: null, rtf: null, image_path: "1.png",
    source_app: null, created_at: 0, pinned: false, folder_id: null,
    qr_text: "https://example.com", image_width: null, image_height: null, ...o,
  };
}

describe("imageQrTextStrategy", () => {
  beforeEach(() => { mockInvoke.mockReset(); mockInvoke.mockResolvedValue(undefined); });

  it("applicable only when qr_text is present", () => {
    expect(imageQrTextStrategy.applicable!(entry({ qr_text: null }))).toBe(false);
    expect(imageQrTextStrategy.applicable!(entry())).toBe(true);
  });

  it("dynamic label shows full short qr_text", () => {
    expect((imageQrTextStrategy.label as (e: ClipboardItem) => string)(entry()))
      .toBe("Paste as QR text  https://example.com");
  });

  it("dynamic label truncates qr_text longer than 30 chars", () => {
    const long = "a".repeat(31);
    expect((imageQrTextStrategy.label as (e: ClipboardItem) => string)(entry({ qr_text: long })))
      .toBe(`Paste as QR text  ${"a".repeat(30)}…`);
  });

  it("execute pastes full qr_text", () => {
    imageQrTextStrategy.execute!(entry({ id: 11, qr_text: "abc" }));
    expect(mockInvoke).toHaveBeenCalledWith("paste_item", {
      text: "abc", plainText: true, itemId: 11,
    });
  });
});
