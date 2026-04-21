export function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function fuzzyMatch(
  query: string,
  text: string
): { score: number; highlighted: string } | null {
  if (query.length === 0) return null;

  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return null;

  // Earlier matches rank higher; matches at position 0 score 200.
  const score = Math.max(0, 200 - idx);

  const highlighted =
    htmlEscape(text.slice(0, idx)) +
    "<b>" + htmlEscape(text.slice(idx, idx + query.length)) + "</b>" +
    htmlEscape(text.slice(idx + query.length));

  return { score, highlighted };
}
