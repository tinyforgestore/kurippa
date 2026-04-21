import { describe, it, expect } from "vitest";
import { fuzzyMatch, htmlEscape } from "./fuzzyMatch";

describe("htmlEscape", () => {
  it("escapes ampersand", () => {
    expect(htmlEscape("a & b")).toBe("a &amp; b");
  });

  it("escapes less-than", () => {
    expect(htmlEscape("a < b")).toBe("a &lt; b");
  });

  it("escapes greater-than", () => {
    expect(htmlEscape("a > b")).toBe("a &gt; b");
  });

  it("escapes double quote", () => {
    expect(htmlEscape('say "hi"')).toBe("say &quot;hi&quot;");
  });

  it("passes through plain text unchanged", () => {
    expect(htmlEscape("hello world")).toBe("hello world");
  });
});

describe("fuzzyMatch", () => {
  it("returns null for empty query", () => {
    expect(fuzzyMatch("", "Document")).toBeNull();
  });

  it("returns null when query is not a substring of text", () => {
    expect(fuzzyMatch("xyz", "Document")).toBeNull();
  });

  it("returns null when chars exist but not contiguous", () => {
    expect(fuzzyMatch("dct", "Document")).toBeNull();
  });

  it("matches case-insensitively", () => {
    expect(fuzzyMatch("DOC", "document")).not.toBeNull();
    expect(fuzzyMatch("doc", "DOCUMENT")).not.toBeNull();
  });

  it("matches when query is an exact prefix", () => {
    const result = fuzzyMatch("Doc", "Document")!;
    expect(result).not.toBeNull();
    expect(result.highlighted).toBe("<b>Doc</b>ument");
  });

  it("matches when query appears in the middle", () => {
    const result = fuzzyMatch("um", "Document")!;
    expect(result).not.toBeNull();
    expect(result.highlighted).toBe("Doc<b>um</b>ent");
  });

  it("wraps the matched span in a single <b> block", () => {
    const result = fuzzyMatch("update", "Update the thing")!;
    expect(result).not.toBeNull();
    expect(result.highlighted).toBe("<b>Update</b> the thing");
  });

  it("full text match wraps everything in a single <b> block", () => {
    expect(fuzzyMatch("hello", "hello")!.highlighted).toBe("<b>hello</b>");
  });

  it("score is 200 for a match at position 0", () => {
    expect(fuzzyMatch("doc", "Document")!.score).toBe(200);
  });

  it("score decreases as match position increases", () => {
    const atZero = fuzzyMatch("up", "Update")!;
    const atTen = fuzzyMatch("up", "some text: update")!;
    expect(atZero.score).toBeGreaterThan(atTen.score);
  });

  it("score is clamped to 0 when match starts at position 200 or later", () => {
    const longPrefix = "x".repeat(200);
    expect(fuzzyMatch("doc", longPrefix + "document")!.score).toBe(0);
  });

  it("HTML-escapes unmatched regions", () => {
    const result = fuzzyMatch("foo", "foo & bar")!;
    expect(result.highlighted).toBe("<b>foo</b> &amp; bar");
  });

  it("HTML-escapes inside the matched span", () => {
    const result = fuzzyMatch("<b>", "say <b> tag")!;
    expect(result.highlighted).toBe("say <b>&lt;b&gt;</b> tag");
  });

  it("uses original casing from text in highlighted output", () => {
    expect(fuzzyMatch("doc", "Document")!.highlighted).toBe("<b>Doc</b>ument");
    expect(fuzzyMatch("DOC", "document")!.highlighted).toBe("<b>doc</b>ument");
  });

  it("HTML-escapes < and > in unmatched regions", () => {
    const result = fuzzyMatch("b", "a<b>z")!;
    expect(result.highlighted).toContain("&lt;");
    expect(result.highlighted).toContain("&gt;");
  });
});
