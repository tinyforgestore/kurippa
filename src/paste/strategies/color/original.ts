import { invoke } from "@tauri-apps/api/core";
import { ClipboardEntry } from "@/entries/base";
import { PasteStrategy } from "@/paste/types";
import { textOf } from "@/paste/textOf";
import { parseColor } from "@/utils/color";

export const originalColorStrategy: PasteStrategy<ClipboardEntry> = {
  id: "color.original",
  label: (entry) => {
    const c = parseColor(textOf(entry));
    return `Paste as original  ${c?.original ?? ""}`;
  },
  preview: (entry) => parseColor(textOf(entry))?.original ?? "",
  execute: (entry) => {
    const c = parseColor(textOf(entry));
    return invoke("paste_item", {
      text: c?.original ?? "",
      plainText: true,
      itemId: entry.id,
    });
  },
};
