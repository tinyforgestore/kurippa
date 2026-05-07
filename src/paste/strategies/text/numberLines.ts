import { invoke } from "@tauri-apps/api/core";
import { ClipboardEntry } from "@/entries/base";
import { PasteStrategy } from "@/paste/types";
import { textOf } from "@/paste/textOf";
import { numberLines } from "@/utils/transforms";

export const numberLinesStrategy: PasteStrategy<ClipboardEntry> = {
  id: "text.numberLines",
  label: "Number lines",
  applicable: (entry) => textOf(entry).includes("\n"),
  preview: (entry) => numberLines(textOf(entry)),
  execute: (entry) =>
    invoke("paste_item", {
      text: numberLines(textOf(entry)),
      plainText: true,
      itemId: entry.id,
    }),
};
