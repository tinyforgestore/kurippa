import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipboardItem } from "@/types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

import { plainStrategy } from "@/paste/strategies/text/plain";

function entry(o: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "text", text: "hello", html: null, rtf: null, image_path: null,
    source_app: null, created_at: 0, pinned: false, folder_id: null,
    qr_text: null, image_width: null, image_height: null, ...o,
  };
}

describe("plainStrategy", () => {
  beforeEach(() => { mockInvoke.mockReset(); mockInvoke.mockResolvedValue(undefined); });

  it("has correct id and label", () => {
    expect(plainStrategy.id).toBe("text.plain");
    expect(plainStrategy.label).toBe("Paste as plain text");
  });

  it("preview returns entry text", () => {
    expect(plainStrategy.preview!(entry({ text: "hi" }))).toBe("hi");
  });

  it("execute invokes paste_item with plainText=true", () => {
    plainStrategy.execute!(entry({ id: 7, text: "hello world" }));
    expect(mockInvoke).toHaveBeenCalledWith("paste_item", {
      text: "hello world", plainText: true, itemId: 7,
    });
  });
});
