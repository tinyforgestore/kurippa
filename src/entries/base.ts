import { ClipboardItem } from "@/types";

export type EntryType = "text" | "rtf" | "url" | "color" | "file-path" | "image";

export type ClipboardEntry = ClipboardItem;

export interface EntryDefinition {
  type: EntryType;
  detect: (entry: ClipboardEntry) => boolean;
}
