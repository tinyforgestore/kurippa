import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipboardItem } from "@/types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

import { codeBlockStrategy } from "@/paste/strategies/text/codeBlock";

function entry(o: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "text", text: "hi", html: null, rtf: null, image_path: null,
    source_app: null, created_at: 0, pinned: false, folder_id: null,
    qr_text: null, image_width: null, image_height: null, ...o,
  };
}

describe("codeBlockStrategy", () => {
  beforeEach(() => { mockInvoke.mockReset(); mockInvoke.mockResolvedValue(undefined); });

  it("id and label", () => {
    expect(codeBlockStrategy.id).toBe("text.codeBlock");
    expect(codeBlockStrategy.label).toBe("Paste wrapped in code block");
  });

  it("preview wraps in triple backticks", () => {
    expect(codeBlockStrategy.preview!(entry({ text: "x" }))).toBe("```\nx\n```");
  });

  it("execute invokes with wrapped text", () => {
    codeBlockStrategy.execute!(entry({ id: 5, text: "x" }));
    expect(mockInvoke).toHaveBeenCalledWith("paste_item", {
      text: "```\nx\n```", plainText: true, itemId: 5,
    });
  });
});
