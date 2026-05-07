import { invoke } from "@tauri-apps/api/core";
import { ClipboardEntry } from "@/entries/base";
import { PasteStrategy } from "@/paste/types";

function qrPreview(qr: string): string {
  return qr.length > 30 ? qr.slice(0, 30) + "…" : qr;
}

// QR text comes from entry.qr_text, not the standard text field — do not switch to textOf().
export const imageQrTextStrategy: PasteStrategy<ClipboardEntry> = {
  id: "image.qrText",
  label: (entry) => `Paste as QR text  ${qrPreview(entry.qr_text ?? "")}`,
  applicable: (entry) => Boolean(entry.qr_text),
  preview: (entry) => entry.qr_text ?? "",
  execute: (entry) =>
    invoke("paste_item", {
      text: entry.qr_text ?? "",
      plainText: true,
      itemId: entry.id,
    }),
};
