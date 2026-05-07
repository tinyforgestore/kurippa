import { invoke } from "@tauri-apps/api/core";
import { ClipboardEntry } from "@/entries/base";
import { PasteStrategy } from "@/paste/types";
import { textOf } from "@/paste/textOf";
import { parseColor } from "@/utils/color";

export const hexColorStrategy: PasteStrategy<ClipboardEntry> = {
  id: "color.hex",
  label: (entry) => {
    const c = parseColor(textOf(entry));
    return `Paste as HEX  ${c?.hex ?? ""}`;
  },
  preview: (entry) => parseColor(textOf(entry))?.hex ?? "",
  execute: (entry) => {
    const c = parseColor(textOf(entry));
    return invoke("paste_item", {
      text: c?.hex ?? "",
      plainText: true,
      itemId: entry.id,
    });
  },
};
