import { invoke } from "@tauri-apps/api/core";
import { ClipboardEntry } from "@/entries/base";
import { PasteStrategy } from "@/paste/types";
import { textOf } from "@/paste/textOf";

export const richRtfStrategy: PasteStrategy<ClipboardEntry> = {
  id: "rtf.rich",
  label: "Paste as rich text",
  preview: (entry) => textOf(entry),
  execute: (entry) =>
    invoke("paste_item", {
      text: textOf(entry),
      plainText: false,
      itemId: entry.id,
    }),
};
