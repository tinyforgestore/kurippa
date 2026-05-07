import { invoke } from "@tauri-apps/api/core";
import { ClipboardEntry } from "@/entries/base";
import { PasteStrategy } from "@/paste/types";
import { textOf } from "@/paste/textOf";
import { trimWhitespace, trimWhitespaceLines } from "@/utils/transforms";

export const trimSingleLineStrategy: PasteStrategy<ClipboardEntry> = {
  id: "text.trim",
  label: "Trim whitespace",
  badge: "0",
  applicable: (entry) => !textOf(entry).includes("\n"),
  preview: (entry) => trimWhitespace(textOf(entry)),
  execute: (entry) =>
    invoke("paste_item", {
      text: trimWhitespace(textOf(entry)),
      plainText: true,
      itemId: entry.id,
    }),
};

export const trimMultiLineStrategy: PasteStrategy<ClipboardEntry> = {
  id: "text.trimLines",
  label: "Trim whitespace",
  applicable: (entry) => textOf(entry).includes("\n"),
  preview: (entry) => trimWhitespaceLines(textOf(entry)),
  execute: (entry) =>
    invoke("paste_item", {
      text: trimWhitespaceLines(textOf(entry)),
      plainText: true,
      itemId: entry.id,
    }),
};
