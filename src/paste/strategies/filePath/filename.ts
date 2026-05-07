import { invoke } from "@tauri-apps/api/core";
import { ClipboardEntry } from "@/entries/base";
import { PasteStrategy } from "@/paste/types";
import { textOf } from "@/paste/textOf";

function filenameOf(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

export const filenameStrategy: PasteStrategy<ClipboardEntry> = {
  id: "filePath.filename",
  label: (entry) => `Paste as filename only  ${filenameOf(textOf(entry))}`,
  preview: (entry) => filenameOf(textOf(entry)),
  execute: (entry) =>
    invoke("paste_item", {
      text: filenameOf(textOf(entry)),
      plainText: true,
      itemId: entry.id,
    }),
};
