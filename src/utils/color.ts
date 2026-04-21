export interface ParsedColor {
  original: string;
  hex: string;
  rgb: string;
  hsl: string;
}

// Matches the full text only (anchored) against known CSS color patterns.
// Returns null if the text is not a CSS color value.
export function parseColor(text: string | null): ParsedColor | null {
  if (!text) return null;
  const t = text.trim();

  const hex6 = /^#([0-9a-fA-F]{6})$/.exec(t);
  if (hex6) {
    const r = parseInt(hex6[1].slice(0, 2), 16);
    const g = parseInt(hex6[1].slice(2, 4), 16);
    const b = parseInt(hex6[1].slice(4, 6), 16);
    return fromRgb(r, g, b, t);
  }

  const hex3 = /^#([0-9a-fA-F]{3})$/.exec(t);
  if (hex3) {
    const r = parseInt(hex3[1][0].repeat(2), 16);
    const g = parseInt(hex3[1][1].repeat(2), 16);
    const b = parseInt(hex3[1][2].repeat(2), 16);
    return fromRgb(r, g, b, t);
  }

  const rgbMatch = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/i.exec(t);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    if (r > 255 || g > 255 || b > 255) return null;
    return fromRgb(r, g, b, t);
  }

  const hslMatch = /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*[\d.]+)?\s*\)$/i.exec(t);
  if (hslMatch) {
    const h = parseInt(hslMatch[1], 10);
    const s = parseInt(hslMatch[2], 10);
    const l = parseInt(hslMatch[3], 10);
    if (h > 360 || s > 100 || l > 100) return null;
    const [r, g, b] = hslToRgb(h, s, l);
    return fromRgb(r, g, b, t);
  }

  return null;
}

function fromRgb(r: number, g: number, b: number, original: string): ParsedColor {
  const hex = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  const rgb = `rgb(${r}, ${g}, ${b})`;
  const [h, s, l] = rgbToHsl(r, g, b);
  const hsl = `hsl(${h}, ${s}%, ${l}%)`;
  return { original, hex, rgb, hsl };
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sn = s / 100, ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
