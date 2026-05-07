import { PasteStrategy } from "@/paste/types";
import { ClipboardEntry } from "@/entries/base";
import { filenameStrategy } from "@/paste/strategies/filePath/filename";

export const filePathStrategies: PasteStrategy<ClipboardEntry>[] = [filenameStrategy];
