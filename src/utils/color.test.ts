import { describe, it, expect } from "vitest";
import { parseColor } from "@/utils/color";

describe("parseColor", () => {
  it("returns null for null input", () => {
    expect(parseColor(null)).toBeNull();
  });

  it("returns null for plain text", () => {
    expect(parseColor("hello")).toBeNull();
  });

  it("returns null for invalid hex (#gggggg)", () => {
    expect(parseColor("#gggggg")).toBeNull();
  });

  it("returns null for out-of-range rgb(300, 0, 0)", () => {
    expect(parseColor("rgb(300, 0, 0)")).toBeNull();
  });

  it("parses #RRGGBB — #ff6600", () => {
    const result = parseColor("#ff6600");
    expect(result).not.toBeNull();
    expect(result!.hex).toBe("#ff6600");
    expect(result!.rgb).toBe("rgb(255, 102, 0)");
    expect(result!.hsl).toBe("hsl(24, 100%, 50%)");
    expect(result!.original).toBe("#ff6600");
  });

  it("parses #RGB — #f60 expands correctly", () => {
    const result = parseColor("#f60");
    expect(result).not.toBeNull();
    expect(result!.hex).toBe("#ff6600");
    expect(result!.rgb).toBe("rgb(255, 102, 0)");
    expect(result!.hsl).toBe("hsl(24, 100%, 50%)");
    expect(result!.original).toBe("#f60");
  });

  it("parses rgb(255, 102, 0)", () => {
    const result = parseColor("rgb(255, 102, 0)");
    expect(result).not.toBeNull();
    expect(result!.hex).toBe("#ff6600");
    expect(result!.rgb).toBe("rgb(255, 102, 0)");
    expect(result!.hsl).toBe("hsl(24, 100%, 50%)");
  });

  it("parses rgba(255, 102, 0, 0.5) — alpha ignored", () => {
    const result = parseColor("rgba(255, 102, 0, 0.5)");
    expect(result).not.toBeNull();
    expect(result!.hex).toBe("#ff6600");
    expect(result!.rgb).toBe("rgb(255, 102, 0)");
    expect(result!.hsl).toBe("hsl(24, 100%, 50%)");
  });

  it("parses hsl(24, 100%, 50%)", () => {
    const result = parseColor("hsl(24, 100%, 50%)");
    expect(result).not.toBeNull();
    expect(result!.hex).toBe("#ff6600");
    expect(result!.rgb).toBe("rgb(255, 102, 0)");
    expect(result!.hsl).toBe("hsl(24, 100%, 50%)");
  });

  it("parses hsla(24, 100%, 50%, 0.8) — alpha ignored", () => {
    const result = parseColor("hsla(24, 100%, 50%, 0.8)");
    expect(result).not.toBeNull();
    expect(result!.hex).toBe("#ff6600");
    expect(result!.rgb).toBe("rgb(255, 102, 0)");
    expect(result!.hsl).toBe("hsl(24, 100%, 50%)");
  });

  it("parses white #ffffff → hsl(0, 0%, 100%)", () => {
    const result = parseColor("#ffffff");
    expect(result).not.toBeNull();
    expect(result!.hex).toBe("#ffffff");
    expect(result!.rgb).toBe("rgb(255, 255, 255)");
    expect(result!.hsl).toBe("hsl(0, 0%, 100%)");
  });

  it("parses black #000000 → hsl(0, 0%, 0%)", () => {
    const result = parseColor("#000000");
    expect(result).not.toBeNull();
    expect(result!.hex).toBe("#000000");
    expect(result!.rgb).toBe("rgb(0, 0, 0)");
    expect(result!.hsl).toBe("hsl(0, 0%, 0%)");
  });

  // --- Null / empty / whitespace ---

  it("returns null for empty string", () => {
    expect(parseColor("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(parseColor("   ")).toBeNull();
  });

  it("trims surrounding whitespace and parses correctly", () => {
    const result = parseColor("  #ff6600  ");
    expect(result).not.toBeNull();
    expect(result!.hex).toBe("#ff6600");
  });

  // --- Out-of-range values ---

  it("returns null for hsl(361, 50%, 50%) — h > 360", () => {
    expect(parseColor("hsl(361, 50%, 50%)")).toBeNull();
  });

  it("returns null for hsl(180, 101%, 50%) — s > 100", () => {
    expect(parseColor("hsl(180, 101%, 50%)")).toBeNull();
  });

  it("returns null for hsl(180, 50%, 101%) — l > 100", () => {
    expect(parseColor("hsl(180, 50%, 101%)")).toBeNull();
  });

  it("returns null for rgb(0, 0, 256) — b > 255", () => {
    expect(parseColor("rgb(0, 0, 256)")).toBeNull();
  });

  // --- All 6 hue sectors of hslToRgb ---

  it("hsl(30, 100%, 50%) → #ff8000 (h < 60 sector)", () => {
    const result = parseColor("hsl(30, 100%, 50%)");
    expect(result).not.toBeNull();
    expect(result!.hex).toBe("#ff8000");
  });

  it("hsl(90, 100%, 50%) → #80ff00 (h < 120 sector)", () => {
    const result = parseColor("hsl(90, 100%, 50%)");
    expect(result).not.toBeNull();
    expect(result!.hex).toBe("#80ff00");
  });

  it("hsl(150, 100%, 50%) → #00ff80 (h < 180 sector)", () => {
    const result = parseColor("hsl(150, 100%, 50%)");
    expect(result).not.toBeNull();
    expect(result!.hex).toBe("#00ff80");
  });

  it("hsl(210, 100%, 50%) → #0080ff (h < 240 sector)", () => {
    const result = parseColor("hsl(210, 100%, 50%)");
    expect(result).not.toBeNull();
    expect(result!.hex).toBe("#0080ff");
  });

  it("hsl(270, 100%, 50%) → #8000ff (h < 300 sector)", () => {
    const result = parseColor("hsl(270, 100%, 50%)");
    expect(result).not.toBeNull();
    expect(result!.hex).toBe("#8000ff");
  });

  it("hsl(330, 100%, 50%) → #ff0080 (h >= 300 sector)", () => {
    const result = parseColor("hsl(330, 100%, 50%)");
    expect(result).not.toBeNull();
    expect(result!.hex).toBe("#ff0080");
  });

  // --- Uppercase hex ---

  it("parses #FF6600 and normalises hex to lowercase #ff6600", () => {
    const result = parseColor("#FF6600");
    expect(result).not.toBeNull();
    expect(result!.hex).toBe("#ff6600");
  });
});
