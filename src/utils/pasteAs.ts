import { ClipboardItem } from "@/types";
import { itemDisplayLabel } from "@/utils/format";
import { parseColor } from "@/utils/color";
import {
  toUpperCase, toLowerCase, toTitleCase, toPascalCase, toCamelCase,
  toSnakeCase, toSlug, trimWhitespace, trimWhitespaceLines,
  joinLines, numberLines,
  wrapInDoubleQuotes, wrapInSingleQuotes, wrapInBackticks,
  wrapInParens, wrapInSquareBrackets, wrapInCurlyBraces,
} from "@/utils/transforms";

export type PasteAsType = "image" | "url" | "color" | "rtf" | "file-path" | "text";

export type PasteAsAction =
  | { kind: "paste-rich"; text: string; itemId: number }
  | { kind: "paste-text"; text: string; itemId: number }
  | { kind: "paste-image"; imageFilename: string; itemId: number };

export type PasteOption =
  | { label: string; shortcutKey?: string; badge?: string; action: PasteAsAction; submenu?: never }
  | { label: string; shortcutKey?: string; badge?: string; submenu: PasteOption[]; action?: never };

const URL_PATTERN = /^https?:\/\/\S+$/;
const FILE_PATH_PATTERN = /^(\/|~\/|[A-Za-z]:\\)/;

export function detectItemType(item: ClipboardItem): PasteAsType {
  if (item.kind === "image") return "image";
  const text = (item.text ?? "").trim();
  if (URL_PATTERN.test(text)) return "url";
  if (parseColor(text) !== null) return "color";
  if (item.kind === "rtf") return "rtf";
  if (FILE_PATH_PATTERN.test(text)) return "file-path";
  return "text";
}

function getSingleLinePlainTextOptions(rawText: string, itemId: number): PasteOption[] {
  return [
    { label: "Paste as plain text", action: { kind: "paste-text", text: rawText, itemId } },
    { label: "Paste wrapped in code block", action: { kind: "paste-text", text: `\`\`\`\n${rawText}\n\`\`\``, itemId } },
    {
      label: "Change case",
      submenu: [
        { label: "UPPERCASE", action: { kind: "paste-text", text: toUpperCase(rawText), itemId } },
        { label: "lowercase", action: { kind: "paste-text", text: toLowerCase(rawText), itemId } },
        { label: "Title Case", action: { kind: "paste-text", text: toTitleCase(rawText), itemId } },
        { label: "PascalCase", action: { kind: "paste-text", text: toPascalCase(rawText), itemId } },
        { label: "camelCase", action: { kind: "paste-text", text: toCamelCase(rawText), itemId } },
        { label: "snake_case", action: { kind: "paste-text", text: toSnakeCase(rawText), itemId } },
        { label: "slug", action: { kind: "paste-text", text: toSlug(rawText), itemId } },
      ],
    },
    {
      label: "Wrap with\u2026",
      submenu: [
        { label: "Wrap in double quotes", shortcutKey: '"', action: { kind: "paste-text", text: wrapInDoubleQuotes(rawText), itemId } },
        { label: "Wrap in single quotes", shortcutKey: "'", action: { kind: "paste-text", text: wrapInSingleQuotes(rawText), itemId } },
        { label: "Wrap in backticks", shortcutKey: "`", action: { kind: "paste-text", text: wrapInBackticks(rawText), itemId } },
        { label: "Wrap in parentheses", shortcutKey: "(", action: { kind: "paste-text", text: wrapInParens(rawText), itemId } },
        { label: "Wrap in square brackets", shortcutKey: "[", action: { kind: "paste-text", text: wrapInSquareBrackets(rawText), itemId } },
        { label: "Wrap in curly braces", shortcutKey: "{", action: { kind: "paste-text", text: wrapInCurlyBraces(rawText), itemId } },
      ],
    },
    { label: "Trim whitespace", badge: "0", action: { kind: "paste-text", text: trimWhitespace(rawText), itemId } },
  ];
}

function getMultiLinePlainTextOptions(rawText: string, itemId: number): PasteOption[] {
  return [
    { label: "Paste as plain text", action: { kind: "paste-text", text: rawText, itemId } },
    { label: "Paste wrapped in code block", action: { kind: "paste-text", text: `\`\`\`\n${rawText}\n\`\`\``, itemId } },
    { label: "Join lines", action: { kind: "paste-text", text: joinLines(rawText), itemId } },
    { label: "Number lines", action: { kind: "paste-text", text: numberLines(rawText), itemId } },
    { label: "Trim whitespace", action: { kind: "paste-text", text: trimWhitespaceLines(rawText), itemId } },
  ];
}

function getPlainTextOptions(rawText: string, itemId: number): PasteOption[] {
  return rawText.includes("\n")
    ? getMultiLinePlainTextOptions(rawText, itemId)
    : getSingleLinePlainTextOptions(rawText, itemId);
}

export function getPasteOptions(item: ClipboardItem): PasteOption[] {
  const type = detectItemType(item);
  const rawText = item.text ?? itemDisplayLabel(item);

  switch (type) {
    case "image": {
      if (item.image_path == null) return [];
      const options: PasteOption[] = [
        { label: "Paste as image", action: { kind: "paste-image", imageFilename: item.image_path, itemId: item.id } },
      ];
      if (item.text) {
        const filename = item.text.split("/").pop() ?? item.text;
        options.push(
          { label: "Paste as file path", action: { kind: "paste-text", text: item.text, itemId: item.id } },
          { label: `Paste as filename  ${filename}`, action: { kind: "paste-text", text: filename, itemId: item.id } },
        );
      }
      if (item.qr_text) {
        const preview = item.qr_text.length > 30 ? item.qr_text.slice(0, 30) + "…" : item.qr_text;
        options.push({
          label: `Paste as QR text  ${preview}`,
          action: { kind: "paste-text", text: item.qr_text, itemId: item.id },
        });
      }
      return options;
    }
    case "url": {
      const url = rawText.trim();
      const domain = url.replace(/^https?:\/\//, "").split("/")[0];
      return [
        ...getPlainTextOptions(url, item.id),
        { label: `Paste as Markdown link ([${domain}](…))`, action: { kind: "paste-text", text: `[${domain}](${url})`, itemId: item.id } },
      ];
    }
    case "color": {
      const color = parseColor(rawText)!;
      return [
        { label: `Paste as original  ${color.original}`, action: { kind: "paste-text", text: color.original, itemId: item.id } },
        { label: `Paste as HEX  ${color.hex}`, action: { kind: "paste-text", text: color.hex, itemId: item.id } },
        { label: `Paste as RGB  ${color.rgb}`, action: { kind: "paste-text", text: color.rgb, itemId: item.id } },
        { label: `Paste as HSL  ${color.hsl}`, action: { kind: "paste-text", text: color.hsl, itemId: item.id } },
      ];
    }
    case "rtf":
      return [
        { label: "Paste as rich text", action: { kind: "paste-rich", text: rawText, itemId: item.id } },
        { label: "Paste as plain text", action: { kind: "paste-text", text: rawText, itemId: item.id } },
      ];
    case "file-path": {
      const path = rawText.trim();
      const filename = path.split(/[/\\]/).pop() ?? path;
      return [
        ...getPlainTextOptions(path, item.id),
        { label: `Paste as filename only  ${filename}`, action: { kind: "paste-text", text: filename, itemId: item.id } },
      ];
    }
    case "text":
    default:
      return getPlainTextOptions(rawText, item.id);
  }
}
