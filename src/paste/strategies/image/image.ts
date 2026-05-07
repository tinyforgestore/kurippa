import { invoke } from "@tauri-apps/api/core";
import { ClipboardEntry } from "@/entries/base";
import { PasteStrategy } from "@/paste/types";

export const imagePasteStrategy: PasteStrategy<ClipboardEntry> = {
  id: "image.paste",
  label: "Paste as image",
  applicable: (entry) => entry.image_path != null,
  preview: () => null,
  execute: (entry) =>
    invoke("paste_image_item", {
      imageFilename: entry.image_path ?? "",
      itemId: entry.id,
    }),
};
