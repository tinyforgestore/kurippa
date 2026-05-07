import { invoke } from "@tauri-apps/api/core";
import { ClipboardEntry } from "@/entries/base";
import { PasteStrategy } from "@/paste/types";
import { textOf } from "@/paste/textOf";
import {
  toUpperCase, toLowerCase, toTitleCase, toPascalCase,
  toCamelCase, toSnakeCase, toSlug,
} from "@/utils/transforms";

function makeCase(id: string, label: string, fn: (s: string) => string): PasteStrategy<ClipboardEntry> {
  return {
    id,
    label,
    preview: (entry) => fn(textOf(entry)),
    execute: (entry) =>
      invoke("paste_item", {
        text: fn(textOf(entry)),
        plainText: true,
        itemId: entry.id,
      }),
  };
}

export const changeCaseStrategy: PasteStrategy<ClipboardEntry> = {
  id: "text.changeCase",
  label: "Change case",
  applicable: (entry) => !textOf(entry).includes("\n"),
  children: [
    makeCase("text.changeCase.upper", "UPPERCASE", toUpperCase),
    makeCase("text.changeCase.lower", "lowercase", toLowerCase),
    makeCase("text.changeCase.title", "Title Case", toTitleCase),
    makeCase("text.changeCase.pascal", "PascalCase", toPascalCase),
    makeCase("text.changeCase.camel", "camelCase", toCamelCase),
    makeCase("text.changeCase.snake", "snake_case", toSnakeCase),
    makeCase("text.changeCase.slug", "slug", toSlug),
  ],
};
