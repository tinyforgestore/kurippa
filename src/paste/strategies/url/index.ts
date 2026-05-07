import { PasteStrategy } from "@/paste/types";
import { ClipboardEntry } from "@/entries/base";
import { markdownLinkStrategy } from "@/paste/strategies/url/markdownLink";

export const urlStrategies: PasteStrategy<ClipboardEntry>[] = [markdownLinkStrategy];
