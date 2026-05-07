import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipboardItem } from "@/types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

import { originalColorStrategy } from "@/paste/strategies/color/original";
import { hexColorStrategy } from "@/paste/strategies/color/hex";
import { rgbColorStrategy } from "@/paste/strategies/color/rgb";
import { hslColorStrategy } from "@/paste/strategies/color/hsl";

function entry(o: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1, kind: "text", text: "#ff6600", html: null, rtf: null, image_path: null,
    source_app: null, created_at: 0, pinned: false, folder_id: null,
    qr_text: null, image_width: null, image_height: null, ...o,
  };
}

describe("color strategies", () => {
  beforeEach(() => { mockInvoke.mockReset(); mockInvoke.mockResolvedValue(undefined); });

  it("original label and execute", () => {
    const e = entry();
    expect((originalColorStrategy.label as (e: ClipboardItem) => string)(e)).toBe("Paste as original  #ff6600");
    originalColorStrategy.execute!(e);
    expect(mockInvoke).toHaveBeenCalledWith("paste_item", { text: "#ff6600", plainText: true, itemId: 1 });
  });

  it("hex preview", () => {
    expect(hexColorStrategy.preview!(entry())).toBe("#ff6600");
  });

  it("rgb preview is rgb(...)", () => {
    expect(rgbColorStrategy.preview!(entry())).toBe("rgb(255, 102, 0)");
  });

  it("hsl preview is hsl(...)", () => {
    expect(hslColorStrategy.preview!(entry())).toBe("hsl(24, 100%, 50%)");
  });
});
