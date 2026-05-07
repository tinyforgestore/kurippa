import { invoke } from "@tauri-apps/api/core";
import { ClipboardEntry } from "@/entries/base";
import { PasteStrategy } from "@/paste/types";
import { textOf } from "@/paste/textOf";

function filenameOf(text: string): string {
  return text.split("/").pop() ?? text;
}

export const imageFilenameStrategy: PasteStrategy<ClipboardEntry> = {
  id: "image.filename",
  label: (entry) => `Paste as filename  ${filenameOf(textOf(entry))}`,
  applicable: (entry) => Boolean(entry.text),
  preview: (entry) => filenameOf(textOf(entry)),
  execute: (entry) =>
    invoke("paste_item", {
      text: filenameOf(textOf(entry)),
      plainText: true,
      itemId: entry.id,
    }),
};
