import { invoke } from "@tauri-apps/api/core";
import { ClipboardEntry } from "@/entries/base";
import { PasteStrategy } from "@/paste/types";
import { textOf } from "@/paste/textOf";
import { parseColor } from "@/utils/color";

export const hslColorStrategy: PasteStrategy<ClipboardEntry> = {
  id: "color.hsl",
  label: (entry) => {
    const c = parseColor(textOf(entry));
    return `Paste as HSL  ${c?.hsl ?? ""}`;
  },
  preview: (entry) => parseColor(textOf(entry))?.hsl ?? "",
  execute: (entry) => {
    const c = parseColor(textOf(entry));
    return invoke("paste_item", {
      text: c?.hsl ?? "",
      plainText: true,
      itemId: entry.id,
    });
  },
};
