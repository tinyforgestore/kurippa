import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipboardItem } from "@/types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

import { markdownLinkStrategy } from "@/paste/strategies/url/markdownLink";

function entry(o: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "text", text: "https://example.com", html: null, rtf: null, image_path: null,
    source_app: null, created_at: 0, pinned: false, folder_id: null,
    qr_text: null, image_width: null, image_height: null, ...o,
  };
}

describe("markdownLinkStrategy", () => {
  beforeEach(() => { mockInvoke.mockReset(); mockInvoke.mockResolvedValue(undefined); });

  it("dynamic label includes domain", () => {
    const e = entry({ text: "https://example.com/x" });
    expect((markdownLinkStrategy.label as (e: ClipboardItem) => string)(e))
      .toBe("Paste as Markdown link ([example.com](…))");
  });

  it("preview formats markdown link", () => {
    expect(markdownLinkStrategy.preview!(entry())).toBe("[example.com](https://example.com)");
  });

  it("execute pastes the markdown link", () => {
    markdownLinkStrategy.execute!(entry({ id: 5 }));
    expect(mockInvoke).toHaveBeenCalledWith("paste_item", {
      text: "[example.com](https://example.com)", plainText: true, itemId: 5,
    });
  });
});
