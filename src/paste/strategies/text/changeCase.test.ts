import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipboardItem } from "@/types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

import { changeCaseStrategy } from "@/paste/strategies/text/changeCase";

function entry(o: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "text", text: "hello world", html: null, rtf: null, image_path: null,
    source_app: null, created_at: 0, pinned: false, folder_id: null,
    qr_text: null, image_width: null, image_height: null, ...o,
  };
}

describe("changeCaseStrategy", () => {
  beforeEach(() => { mockInvoke.mockReset(); mockInvoke.mockResolvedValue(undefined); });

  it("has children but no execute (group)", () => {
    expect(changeCaseStrategy.children).toBeDefined();
    expect(changeCaseStrategy.execute).toBeUndefined();
  });

  it("applicable false when text contains newline", () => {
    expect(changeCaseStrategy.applicable!(entry({ text: "a\nb" }))).toBe(false);
  });

  it("applicable true for single-line", () => {
    expect(changeCaseStrategy.applicable!(entry({ text: "hi" }))).toBe(true);
  });

  it("first child is UPPERCASE and pastes uppercase", () => {
    const upper = changeCaseStrategy.children![0];
    expect(upper.label).toBe("UPPERCASE");
    upper.execute!(entry({ id: 3, text: "hello" }));
    expect(mockInvoke).toHaveBeenCalledWith("paste_item", {
      text: "HELLO", plainText: true, itemId: 3,
    });
  });

  it("children labels in order", () => {
    expect(changeCaseStrategy.children!.map((c) => c.label)).toEqual([
      "UPPERCASE", "lowercase", "Title Case", "PascalCase",
      "camelCase", "snake_case", "slug",
    ]);
  });
});
