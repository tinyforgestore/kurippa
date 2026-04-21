import { ClipboardItem } from "@/types";

export function itemDisplayLabel(item: ClipboardItem, maxChars?: number): string {
  const text = item.text ?? (item.image_path ? "[image]" : `[${item.kind}]`);
  return maxChars && text.length > maxChars ? text.slice(0, maxChars) + "…" : text;
}

/**
 * Extracts a human-readable app name from a macOS bundle ID.
 * e.g. "com.apple.finder" → "Finder"
 */
export function formatAppName(bundleId: string): string {
  if (!bundleId) return bundleId;
  const parts = bundleId.split(".");
  const last = parts[parts.length - 1] ?? bundleId;
  return last.charAt(0).toUpperCase() + last.slice(1);
}

export function truncateMiddle(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  const dotIdx = s.lastIndexOf(".");
  const ext = dotIdx > 0 ? s.slice(dotIdx) : "";
  const stem = dotIdx > 0 ? s.slice(0, dotIdx) : s;
  const budget = maxLen - ext.length - 1; // -1 for ellipsis char
  if (budget <= 2) return s.slice(0, maxLen - 1) + "…";
  const head = Math.ceil(budget / 2);
  const tail = Math.floor(budget / 2);
  return stem.slice(0, head) + "…" + stem.slice(stem.length - tail) + ext;
}

/**
 * Returns a formatted byte-size string for a text string.
 * Uses TextEncoder for accurate byte count (handles multi-byte characters).
 * e.g. 500 bytes → "<1 kb", 1500 bytes → "1.5 kb"
 */
export function formatSize(text: string): string {
  const bytes = new TextEncoder().encode(text).byteLength;
  const kb = bytes / 1024;
  return kb < 1 ? "<1 kb" : `${kb.toFixed(1)} kb`;
}
