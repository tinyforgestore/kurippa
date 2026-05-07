import { PasteStrategy } from "@/paste/types";
import { ClipboardEntry } from "@/entries/base";
import { originalColorStrategy } from "@/paste/strategies/color/original";
import { hexColorStrategy } from "@/paste/strategies/color/hex";
import { rgbColorStrategy } from "@/paste/strategies/color/rgb";
import { hslColorStrategy } from "@/paste/strategies/color/hsl";

export const colorStrategies: PasteStrategy<ClipboardEntry>[] = [
  originalColorStrategy,
  hexColorStrategy,
  rgbColorStrategy,
  hslColorStrategy,
];
