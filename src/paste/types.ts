import { ClipboardEntry } from "@/entries/base";

export interface PasteStrategy<T extends ClipboardEntry = ClipboardEntry> {
  id: string;
  label: string | ((entry: T) => string);
  shortcutKey?: string;
  badge?: string;
  applicable?: (entry: T) => boolean;
  preview?: (entry: T) => string | null;
  execute?: (entry: T) => Promise<void>;
  children?: PasteStrategy<T>[];
}
