import { PasteStrategy } from "@/paste/types";
import { ClipboardEntry } from "@/entries/base";
import { imagePasteStrategy } from "@/paste/strategies/image/image";
import { imageFilePathStrategy } from "@/paste/strategies/image/filePath";
import { imageFilenameStrategy } from "@/paste/strategies/image/filename";
import { imageQrTextStrategy } from "@/paste/strategies/image/qrText";

export const imageStrategies: PasteStrategy<ClipboardEntry>[] = [
  imagePasteStrategy,
  imageFilePathStrategy,
  imageFilenameStrategy,
  imageQrTextStrategy,
];
