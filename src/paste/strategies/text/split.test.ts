import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipboardItem } from "@/types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

import { splitStrategy } from "@/paste/strategies/text/split";

function entry(o: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "text", text: "car,plane,train,ship", html: null, rtf: null, image_path: null,
    source_app: null, created_at: 0, pinned: false, folder_id: null,
    qr_text: null, image_width: null, image_height: null, ...o,
  };
}

function child(label: string) {
  return splitStrategy.children!.find((c) => c.label === label)!;
}

describe("splitStrategy", () => {
  beforeEach(() => { mockInvoke.mockReset(); mockInvoke.mockResolvedValue(undefined); });

  it("is a group with one child per delimiter", () => {
    expect(splitStrategy.execute).toBeUndefined();
    expect(splitStrategy.children!.map((c) => c.label)).toEqual([
      "Comma", "Newline", "Space", "Tab", "Semicolon", "Pipe",
    ]);
  });

  it("is applicable when some delimiter yields 2+ pieces", () => {
    expect(splitStrategy.applicable!(entry({ text: "a,b" }))).toBe(true);
    expect(splitStrategy.applicable!(entry({ text: "a\nb" }))).toBe(true);
    expect(splitStrategy.applicable!(entry({ text: "a|b" }))).toBe(true);
  });

  it("is not applicable for a single piece", () => {
    expect(splitStrategy.applicable!(entry({ text: "hello" }))).toBe(false);
    expect(splitStrategy.applicable!(entry({ text: "hello," }))).toBe(false);
    expect(splitStrategy.applicable!(entry({ text: "  " }))).toBe(false);
  });

  it("child is applicable only when its delimiter yields 2+ pieces", () => {
    const e = entry({ text: "a,b" });
    expect(child("Comma").applicable!(e)).toBe(true);
    expect(child("Pipe").applicable!(e)).toBe(false);
    expect(child("Space").applicable!(e)).toBe(false);
  });

  it("previews pieces one per line", () => {
    expect(child("Comma").preview!(entry({ text: "car, plane,,train" }))).toBe("car\nplane\ntrain");
  });

  it("splits on newline including CRLF", () => {
    expect(child("Newline").preview!(entry({ text: "a\r\nb\nc" }))).toBe("a\nb\nc");
  });

  it("shows embedded newlines as a marker so lines equal pieces", () => {
    const preview = child("Comma").preview!(entry({ text: "a,b\nc" }))!;
    expect(preview).toBe("a\nb⏎c");
    expect(preview.split("\n")).toHaveLength(2);
  });

  it("does not alter the inserted texts with the newline marker", () => {
    child("Comma").execute!(entry({ text: "a,b\nc" }));
    expect(mockInvoke).toHaveBeenCalledWith("insert_text_items", { texts: ["a", "b\nc"] });
  });

  it.each([
    ["Comma", ","], ["Newline", "\n"], ["Space", " "],
    ["Tab", "\t"], ["Semicolon", ";"], ["Pipe", "|"],
  ])("%s child is offered for exactly 50 pieces but not 51", (label, delimiter) => {
    const pieces = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`).join(delimiter);
    expect(child(label).applicable!(entry({ text: pieces(50) }))).toBe(true);
    expect(child(label).applicable!(entry({ text: pieces(51) }))).toBe(false);
  });

  it("parent is not applicable when every delimiter yields more than 50 pieces", () => {
    const text = Array.from({ length: 51 }, (_, i) => `p${i}`).join(",");
    expect(splitStrategy.applicable!(entry({ text }))).toBe(false);
  });

  it.each([
    "https://a.com,https://b.com",
    "/var/log/a.log\n/var/log/b.log",
    "~/a, ~/b",
    "C:\\a.txt;C:\\b.txt",
  ])("is applicable for url/file-path lists: %s", (text) => {
    expect(splitStrategy.applicable!(entry({ text }))).toBe(true);
  });

  it("is not applicable for a single url or path", () => {
    expect(splitStrategy.applicable!(entry({ text: "https://example.com/a" }))).toBe(false);
    expect(splitStrategy.applicable!(entry({ text: "/Users/me/file.txt" }))).toBe(false);
  });

  it("marks children as item-inserting", () => {
    expect(splitStrategy.children!.every((c) => c.insertsItems)).toBe(true);
  });

  it("execute invokes insert_text_items with the pieces", () => {
    child("Comma").execute!(entry());
    expect(mockInvoke).toHaveBeenCalledOnce();
    expect(mockInvoke).toHaveBeenCalledWith("insert_text_items", {
      texts: ["car", "plane", "train", "ship"],
    });
  });

  it.each([
    ["Newline", "a\nb", ["a", "b"]],
    ["Space", "a b", ["a", "b"]],
    ["Tab", "a\tb", ["a", "b"]],
    ["Semicolon", "a;b", ["a", "b"]],
    ["Pipe", "a|b", ["a", "b"]],
  ])("execute on %s uses that delimiter", (label, text, texts) => {
    child(label).execute!(entry({ text }));
    expect(mockInvoke).toHaveBeenCalledWith("insert_text_items", { texts });
  });

  it("never invokes paste_item", () => {
    child("Comma").execute!(entry());
    expect(mockInvoke).not.toHaveBeenCalledWith("paste_item", expect.anything());
  });
});
