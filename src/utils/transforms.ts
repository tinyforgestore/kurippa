export function toUpperCase(text: string): string {
  return text.toUpperCase();
}

export function toLowerCase(text: string): string {
  return text.toLowerCase();
}

export function toTitleCase(text: string): string {
  return text.toLowerCase().replace(/(^|\s)(\w)/g, (_, space, char) => space + char.toUpperCase());
}

export function toPascalCase(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

export function toCamelCase(text: string): string {
  const pascal = toPascalCase(text);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function toSnakeCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function trimWhitespace(text: string): string {
  return text.trim();
}

export function trimWhitespaceLines(text: string): string {
  return text.split("\n").map((line) => line.trim()).join("\n");
}

export function joinLines(text: string): string {
  return text.replace(/\n/g, " ").replace(/  +/g, " ").trim();
}

export function numberLines(text: string): string {
  return text.split("\n").map((line, i) => `${i + 1}. ${line}`).join("\n");
}

export function wrapInDoubleQuotes(text: string): string {
  return `"${text}"`;
}

export function wrapInSingleQuotes(text: string): string {
  return `'${text}'`;
}

export function wrapInBackticks(text: string): string {
  return `\`${text}\``;
}

export function wrapInParens(text: string): string {
  return `(${text})`;
}

export function wrapInSquareBrackets(text: string): string {
  return `[${text}]`;
}

export function wrapInCurlyBraces(text: string): string {
  return `{${text}}`;
}
