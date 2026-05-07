import { describe, it, expect, vi } from "vitest";
import { execute } from "@/paste/executor";
import { PasteStrategy } from "@/paste/types";
import { ClipboardItem } from "@/types";

function makeEntry(): ClipboardItem {
  return {
    id: 1, kind: "text", text: "hi", html: null, rtf: null, image_path: null,
    source_app: null, created_at: 0, pinned: false, folder_id: null,
    qr_text: null, image_width: null, image_height: null,
  };
}

describe("execute", () => {
  it("calls strategy.execute and returns its promise", async () => {
    const exec = vi.fn(() => Promise.resolve());
    const s: PasteStrategy = { id: "x.y", label: "X", execute: exec };
    await execute(makeEntry(), s);
    expect(exec).toHaveBeenCalledOnce();
  });

  it("rejects when strategy has no execute", async () => {
    const s: PasteStrategy = { id: "group", label: "G", children: [] };
    await expect(execute(makeEntry(), s)).rejects.toThrow(/group only/);
  });
});
