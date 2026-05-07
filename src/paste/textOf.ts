import { ClipboardEntry } from "@/entries/base";
import { detectEntry } from "@/entries";
import { itemDisplayLabel } from "@/utils/format";

/**
 * Resolves the canonical text payload for a clipboard entry, mirroring the
 * pre-strategy pasteAs.ts behavior:
 *  - url / file-path: trimmed entry.text
 *  - text / rtf / color: entry.text ?? itemDisplayLabel(entry)
 *  - image: entry.text ?? "" (image strategies branch on this themselves)
 */
export function textOf(entry: ClipboardEntry): string {
  const type = detectEntry(entry);
  if (type === "url" || type === "file-path") {
    return (entry.text ?? "").trim();
  }
  if (type === "image") {
    return entry.text ?? "";
  }
  return entry.text ?? itemDisplayLabel(entry);
}
