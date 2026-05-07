import { PasteStrategy } from "@/paste/types";
import { ClipboardEntry } from "@/entries/base";
import { richRtfStrategy } from "@/paste/strategies/rtf/rich";
import { plainRtfStrategy } from "@/paste/strategies/rtf/plain";

export const rtfStrategies: PasteStrategy<ClipboardEntry>[] = [richRtfStrategy, plainRtfStrategy];
