import { ClipboardEntry, EntryDefinition, EntryType } from "@/entries/base";
import { ImageEntry } from "@/entries/image";
import { UrlEntry } from "@/entries/url";
import { ColorEntry } from "@/entries/color";
import { RtfEntry } from "@/entries/rtf";
import { FilePathEntry } from "@/entries/filePath";
import { TextEntry } from "@/entries/text";

export type { EntryType, ClipboardEntry } from "@/entries/base";

export const detectionChain: EntryDefinition[] = [
  ImageEntry,
  UrlEntry,
  ColorEntry,
  RtfEntry,
  FilePathEntry,
  TextEntry,
];

export function detectEntry(entry: ClipboardEntry): EntryType {
  for (const def of detectionChain) {
    if (def.detect(entry)) return def.type;
  }
  return "text";
}
