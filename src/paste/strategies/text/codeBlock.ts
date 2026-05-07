import { invoke } from "@tauri-apps/api/core";
import { ClipboardEntry } from "@/entries/base";
import { PasteStrategy } from "@/paste/types";
import { textOf } from "@/paste/textOf";

const wrap = (text: string) => `\`\`\`\n${text}\n\`\`\``;

export const codeBlockStrategy: PasteStrategy<ClipboardEntry> = {
  id: "text.codeBlock",
  label: "Paste wrapped in code block",
  preview: (entry) => wrap(textOf(entry)),
  execute: (entry) =>
    invoke("paste_item", {
      text: wrap(textOf(entry)),
      plainText: true,
      itemId: entry.id,
    }),
};
