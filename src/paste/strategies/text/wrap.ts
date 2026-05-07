import { invoke } from "@tauri-apps/api/core";
import { ClipboardEntry } from "@/entries/base";
import { PasteStrategy } from "@/paste/types";
import { textOf } from "@/paste/textOf";
import {
  wrapInDoubleQuotes, wrapInSingleQuotes, wrapInBackticks,
  wrapInParens, wrapInSquareBrackets, wrapInCurlyBraces,
} from "@/utils/transforms";

function makeWrap(
  id: string,
  label: string,
  shortcutKey: string,
  fn: (s: string) => string,
): PasteStrategy<ClipboardEntry> {
  return {
    id,
    label,
    shortcutKey,
    preview: (entry) => fn(textOf(entry)),
    execute: (entry) =>
      invoke("paste_item", {
        text: fn(textOf(entry)),
        plainText: true,
        itemId: entry.id,
      }),
  };
}

export const wrapStrategy: PasteStrategy<ClipboardEntry> = {
  id: "text.wrap",
  label: "Wrap with…",
  applicable: (entry) => !textOf(entry).includes("\n"),
  children: [
    makeWrap("text.wrap.doubleQuotes", "Wrap in double quotes", '"', wrapInDoubleQuotes),
    makeWrap("text.wrap.singleQuotes", "Wrap in single quotes", "'", wrapInSingleQuotes),
    makeWrap("text.wrap.backticks", "Wrap in backticks", "`", wrapInBackticks),
    makeWrap("text.wrap.parens", "Wrap in parentheses", "(", wrapInParens),
    makeWrap("text.wrap.squareBrackets", "Wrap in square brackets", "[", wrapInSquareBrackets),
    makeWrap("text.wrap.curlyBraces", "Wrap in curly braces", "{", wrapInCurlyBraces),
  ],
};
