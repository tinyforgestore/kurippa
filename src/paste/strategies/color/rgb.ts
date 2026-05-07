import { invoke } from "@tauri-apps/api/core";
import { ClipboardEntry } from "@/entries/base";
import { PasteStrategy } from "@/paste/types";
import { textOf } from "@/paste/textOf";
import { parseColor } from "@/utils/color";

export const rgbColorStrategy: PasteStrategy<ClipboardEntry> = {
  id: "color.rgb",
  label: (entry) => {
    const c = parseColor(textOf(entry));
    return `Paste as RGB  ${c?.rgb ?? ""}`;
  },
  preview: (entry) => parseColor(textOf(entry))?.rgb ?? "",
  execute: (entry) => {
    const c = parseColor(textOf(entry));
    return invoke("paste_item", {
      text: c?.rgb ?? "",
      plainText: true,
      itemId: entry.id,
    });
  },
};
