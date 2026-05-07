import { EntryType, ClipboardEntry } from "@/entries/base";
import { PasteStrategy } from "@/paste/types";
import { textStrategies } from "@/paste/strategies/text";
import { urlStrategies } from "@/paste/strategies/url";
import { colorStrategies } from "@/paste/strategies/color";
import { rtfStrategies } from "@/paste/strategies/rtf";
import { filePathStrategies } from "@/paste/strategies/filePath";
import { imageStrategies } from "@/paste/strategies/image";

const registry: Record<EntryType, PasteStrategy<ClipboardEntry>[]> = {
  text: textStrategies,
  rtf: rtfStrategies,
  url: [...textStrategies, ...urlStrategies],
  color: colorStrategies,
  "file-path": [...textStrategies, ...filePathStrategies],
  image: imageStrategies,
};

export function strategiesFor(type: EntryType): PasteStrategy<ClipboardEntry>[] {
  return registry[type];
}
