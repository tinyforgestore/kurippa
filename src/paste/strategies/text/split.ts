import { invoke } from "@tauri-apps/api/core";
import { ClipboardEntry } from "@/entries/base";
import { PasteStrategy } from "@/paste/types";
import { textOf } from "@/paste/textOf";
import { splitText } from "@/utils/transforms";

const MIN_PIECES = 2;
const NEWLINE_MARKER = "⏎";
// Mirrors MAX_SPLIT_PIECES in src-tauri/src/db/items.rs.
const MAX_SPLIT_PIECES = 50;

const hasPieces = (entry: ClipboardEntry, delimiter: string) => {
  const count = splitText(textOf(entry), delimiter).length;
  return count >= MIN_PIECES && count <= MAX_SPLIT_PIECES;
};

// Pieces may hold newlines; show them inline so the line count equals the piece count.
const previewOf = (entry: ClipboardEntry, delimiter: string) =>
  splitText(textOf(entry), delimiter)
    .map((piece) => piece.replace(/\n/g, NEWLINE_MARKER))
    .join("\n");

function makeSplit(id: string, label: string, delimiter: string): PasteStrategy<ClipboardEntry> {
  return {
    id,
    label,
    insertsItems: true,
    applicable: (entry) => hasPieces(entry, delimiter),
    preview: (entry) => previewOf(entry, delimiter),
    execute: (entry) =>
      invoke("insert_text_items", { texts: splitText(textOf(entry), delimiter) }),
  };
}

const children = [
  makeSplit("text.split.comma", "Comma", ","),
  makeSplit("text.split.newline", "Newline", "\n"),
  makeSplit("text.split.space", "Space", " "),
  makeSplit("text.split.tab", "Tab", "\t"),
  makeSplit("text.split.semicolon", "Semicolon", ";"),
  makeSplit("text.split.pipe", "Pipe", "|"),
];

export const splitStrategy: PasteStrategy<ClipboardEntry> = {
  id: "text.split",
  label: "Split into items",
  applicable: (entry) => children.some((child) => child.applicable!(entry)),
  children,
};
