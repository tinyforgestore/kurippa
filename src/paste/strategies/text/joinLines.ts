import { invoke } from "@tauri-apps/api/core";
import { ClipboardEntry } from "@/entries/base";
import { PasteStrategy } from "@/paste/types";
import { textOf } from "@/paste/textOf";
import { joinLines } from "@/utils/transforms";

export const joinLinesStrategy: PasteStrategy<ClipboardEntry> = {
  id: "text.joinLines",
  label: "Join lines",
  applicable: (entry) => textOf(entry).includes("\n"),
  preview: (entry) => joinLines(textOf(entry)),
  execute: (entry) =>
    invoke("paste_item", {
      text: joinLines(textOf(entry)),
      plainText: true,
      itemId: entry.id,
    }),
};
