import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipboardItem } from "@/types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

import { filenameStrategy } from "@/paste/strategies/filePath/filename";

function entry(o: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "text", text: "/Users/x/doc.pdf", html: null, rtf: null, image_path: null,
    source_app: null, created_at: 0, pinned: false, folder_id: null,
    qr_text: null, image_width: null, image_height: null, ...o,
  };
}

describe("filenameStrategy", () => {
  beforeEach(() => { mockInvoke.mockReset(); mockInvoke.mockResolvedValue(undefined); });

  it("dynamic label is filename only", () => {
    expect((filenameStrategy.label as (e: ClipboardItem) => string)(entry()))
      .toBe("Paste as filename only  doc.pdf");
  });

  it("preview returns filename component", () => {
    expect(filenameStrategy.preview!(entry({ text: "C:\\a\\b.txt" }))).toBe("b.txt");
  });

  it("execute pastes filename", () => {
    filenameStrategy.execute!(entry({ id: 2, text: "/foo/bar.md" }));
    expect(mockInvoke).toHaveBeenCalledWith("paste_item", {
      text: "bar.md", plainText: true, itemId: 2,
    });
  });
});
