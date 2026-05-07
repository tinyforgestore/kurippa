import { ClipboardItem } from "@/types";
import { ClipboardEntry, EntryType } from "@/entries/base";
import { detectEntry } from "@/entries";
import { strategiesFor } from "@/paste/registry";
import { PasteStrategy } from "@/paste/types";

export type PasteAsType = EntryType;

export type PasteAsAction =
  | { kind: "paste-rich"; text: string; itemId: number }
  | { kind: "paste-text"; text: string; itemId: number }
  | { kind: "paste-image"; imageFilename: string; itemId: number };

export type PasteOption =
  | { label: string; shortcutKey?: string; badge?: string; action: PasteAsAction; submenu?: never }
  | { label: string; shortcutKey?: string; badge?: string; submenu: PasteOption[]; action?: never };

const optionToStrategy = new WeakMap<PasteOption, PasteStrategy<ClipboardEntry>>();
const optionToEntry = new WeakMap<PasteOption, ClipboardEntry>();

export function strategyForOption(option: PasteOption): PasteStrategy<ClipboardEntry> | undefined {
  return optionToStrategy.get(option);
}

export function entryForOption(option: PasteOption): ClipboardEntry | undefined {
  return optionToEntry.get(option);
}

export function detectItemType(item: ClipboardItem): PasteAsType {
  return detectEntry(item);
}

function resolveLabel(strategy: PasteStrategy<ClipboardEntry>, entry: ClipboardEntry): string {
  return typeof strategy.label === "function" ? strategy.label(entry) : strategy.label;
}

function isApplicable(strategy: PasteStrategy<ClipboardEntry>, entry: ClipboardEntry): boolean {
  return strategy.applicable ? strategy.applicable(entry) : true;
}

function actionFor(
  strategy: PasteStrategy<ClipboardEntry>,
  entry: ClipboardEntry,
): PasteAsAction | undefined {
  if (strategy.id === "image.paste") {
    return { kind: "paste-image", imageFilename: entry.image_path ?? "", itemId: entry.id };
  }
  const text = strategy.preview ? strategy.preview(entry) ?? "" : "";
  if (strategy.id === "rtf.rich") {
    return { kind: "paste-rich", text, itemId: entry.id };
  }
  return { kind: "paste-text", text, itemId: entry.id };
}

function toPasteOption(
  strategy: PasteStrategy<ClipboardEntry>,
  entry: ClipboardEntry,
): PasteOption {
  const label = resolveLabel(strategy, entry);
  if (strategy.children && strategy.children.length > 0) {
    const submenu = strategy.children
      .filter((child) => isApplicable(child, entry))
      .map((child) => toPasteOption(child, entry));
    const option: PasteOption = {
      label,
      ...(strategy.shortcutKey ? { shortcutKey: strategy.shortcutKey } : {}),
      ...(strategy.badge ? { badge: strategy.badge } : {}),
      submenu,
    };
    optionToStrategy.set(option, strategy);
    optionToEntry.set(option, entry);
    return option;
  }
  const action = actionFor(strategy, entry);
  const option: PasteOption = {
    label,
    ...(strategy.shortcutKey ? { shortcutKey: strategy.shortcutKey } : {}),
    ...(strategy.badge ? { badge: strategy.badge } : {}),
    action: action!,
  };
  optionToStrategy.set(option, strategy);
  optionToEntry.set(option, entry);
  return option;
}

export function getPasteOptions(item: ClipboardItem): PasteOption[] {
  const type = detectEntry(item);
  const strategies = strategiesFor(type);
  return strategies
    .filter((s) => isApplicable(s, item))
    .map((s) => toPasteOption(s, item));
}
