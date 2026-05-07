import { invoke } from "@tauri-apps/api/core";
import { ClipboardEntry } from "@/entries/base";
import { PasteStrategy } from "@/paste/types";
import { textOf } from "@/paste/textOf";

export const plainStrategy: PasteStrategy<ClipboardEntry> = {
  id: "text.plain",
  label: "Paste as plain text",
  preview: (entry) => textOf(entry),
  execute: (entry) =>
    invoke("paste_item", {
      text: textOf(entry),
      plainText: true,
      itemId: entry.id,
    }),
};
