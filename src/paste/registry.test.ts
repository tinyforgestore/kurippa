import { describe, it, expect } from "vitest";
import { strategiesFor } from "@/paste/registry";

const textIds = [
  "text.plain",
  "text.codeBlock",
  "text.changeCase",
  "text.wrap",
  "text.joinLines",
  "text.numberLines",
  "text.trim",
  "text.trimLines",
];

describe("strategiesFor", () => {
  it("text returns the unified text strategy list", () => {
    expect(strategiesFor("text").map((s) => s.id)).toEqual(textIds);
  });

  it("rtf returns rtf-only strategies", () => {
    expect(strategiesFor("rtf").map((s) => s.id)).toEqual(["rtf.rich", "rtf.plain"]);
  });

  it("url appends url strategies after text", () => {
    expect(strategiesFor("url").map((s) => s.id)).toEqual([...textIds, "url.markdownLink"]);
  });

  it("color returns color-only strategies", () => {
    expect(strategiesFor("color").map((s) => s.id)).toEqual([
      "color.original",
      "color.hex",
      "color.rgb",
      "color.hsl",
    ]);
  });

  it("file-path appends filename after text", () => {
    expect(strategiesFor("file-path").map((s) => s.id)).toEqual([...textIds, "filePath.filename"]);
  });

  it("image returns image-only strategies", () => {
    expect(strategiesFor("image").map((s) => s.id)).toEqual([
      "image.paste",
      "image.filePath",
      "image.filename",
      "image.qrText",
    ]);
  });
});
