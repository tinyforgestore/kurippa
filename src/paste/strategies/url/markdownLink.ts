import { invoke } from "@tauri-apps/api/core";
import { ClipboardEntry } from "@/entries/base";
import { PasteStrategy } from "@/paste/types";
import { textOf } from "@/paste/textOf";

function domainOf(url: string): string {
  return url.replace(/^https?:\/\//, "").split("/")[0];
}

export const markdownLinkStrategy: PasteStrategy<ClipboardEntry> = {
  id: "url.markdownLink",
  label: (entry) => `Paste as Markdown link ([${domainOf(textOf(entry))}](…))`,
  preview: (entry) => {
    const url = textOf(entry);
    return `[${domainOf(url)}](${url})`;
  },
  execute: (entry) => {
    const url = textOf(entry);
    return invoke("paste_item", {
      text: `[${domainOf(url)}](${url})`,
      plainText: true,
      itemId: entry.id,
    });
  },
};
