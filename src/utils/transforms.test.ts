import { describe, it, expect } from "vitest";
import { toUpperCase, toLowerCase, toPascalCase, toCamelCase, toSnakeCase, toSlug, trimWhitespace } from "@/utils/transforms";

describe("toUpperCase", () => {
  it("uppercases a normal string", () => {
    expect(toUpperCase("hello world")).toBe("HELLO WORLD");
  });

  it("is a no-op on already-uppercase string", () => {
    expect(toUpperCase("HELLO WORLD")).toBe("HELLO WORLD");
  });

  it("returns empty string for empty input", () => {
    expect(toUpperCase("")).toBe("");
  });

  it("uppercases mixed case", () => {
    expect(toUpperCase("hElLo WoRlD")).toBe("HELLO WORLD");
  });
});

describe("toLowerCase", () => {
  it("lowercases a normal string", () => {
    expect(toLowerCase("HELLO WORLD")).toBe("hello world");
  });

  it("is a no-op on already-lowercase string", () => {
    expect(toLowerCase("hello world")).toBe("hello world");
  });

  it("returns empty string for empty input", () => {
    expect(toLowerCase("")).toBe("");
  });

  it("lowercases mixed case", () => {
    expect(toLowerCase("hElLo WoRlD")).toBe("hello world");
  });
});

describe("toPascalCase", () => {
  it("converts space-separated words", () => {
    expect(toPascalCase("hello world")).toBe("HelloWorld");
  });

  it("converts underscore-separated words", () => {
    expect(toPascalCase("hello_world")).toBe("HelloWorld");
  });

  it("converts hyphen-separated words", () => {
    expect(toPascalCase("hello-world")).toBe("HelloWorld");
  });

  it("handles already-camelCase input", () => {
    expect(toPascalCase("helloWorld")).toBe("HelloWorld");
  });

  it("handles ALL_CAPS_SNAKE input", () => {
    expect(toPascalCase("HELLO_WORLD")).toBe("HelloWorld");
  });

  it("returns empty string for empty input", () => {
    expect(toPascalCase("")).toBe("");
  });

  it("handles single word", () => {
    expect(toPascalCase("hello")).toBe("Hello");
  });

  it("handles multiple words with mixed delimiters", () => {
    expect(toPascalCase("foo bar-baz_qux")).toBe("FooBarBazQux");
  });
});

describe("toCamelCase", () => {
  it("converts space-separated words", () => {
    expect(toCamelCase("hello world")).toBe("helloWorld");
  });

  it("converts underscore-separated words", () => {
    expect(toCamelCase("hello_world")).toBe("helloWorld");
  });

  it("converts hyphen-separated words", () => {
    expect(toCamelCase("hello-world")).toBe("helloWorld");
  });

  it("handles already-camelCase input", () => {
    expect(toCamelCase("helloWorld")).toBe("helloWorld");
  });

  it("handles ALL_CAPS_SNAKE input", () => {
    expect(toCamelCase("HELLO_WORLD")).toBe("helloWorld");
  });

  it("returns empty string for empty input", () => {
    expect(toCamelCase("")).toBe("");
  });

  it("handles single word", () => {
    expect(toCamelCase("hello")).toBe("hello");
  });
});

describe("toSnakeCase", () => {
  it("converts space-separated words", () => {
    expect(toSnakeCase("hello world")).toBe("hello_world");
  });

  it("replaces hyphens with underscores", () => {
    expect(toSnakeCase("hello-world")).toBe("hello_world");
  });

  it("is a no-op on already-snake_case string", () => {
    expect(toSnakeCase("hello_world")).toBe("hello_world");
  });

  it("returns empty string for empty input", () => {
    expect(toSnakeCase("")).toBe("");
  });

  it("strips special characters", () => {
    expect(toSnakeCase("hello! world@")).toBe("hello_world");
  });

  it("lowercases the result", () => {
    expect(toSnakeCase("Hello World")).toBe("hello_world");
  });

  it("handles multiple consecutive spaces", () => {
    expect(toSnakeCase("hello   world")).toBe("hello_world");
  });
});

describe("toSlug", () => {
  it("converts space-separated words", () => {
    expect(toSlug("hello world")).toBe("hello-world");
  });

  it("replaces underscores with hyphens", () => {
    expect(toSlug("hello_world")).toBe("hello-world");
  });

  it("is a no-op on already-slug string", () => {
    expect(toSlug("hello-world")).toBe("hello-world");
  });

  it("returns empty string for empty input", () => {
    expect(toSlug("")).toBe("");
  });

  it("strips special characters", () => {
    expect(toSlug("hello! world@")).toBe("hello-world");
  });

  it("lowercases the result", () => {
    expect(toSlug("Hello World")).toBe("hello-world");
  });

  it("handles multiple consecutive spaces", () => {
    expect(toSlug("hello   world")).toBe("hello-world");
  });
});

describe("trimWhitespace", () => {
  it("trims leading and trailing spaces", () => {
    expect(trimWhitespace("  hello world  ")).toBe("hello world");
  });

  it("is a no-op on already-trimmed string", () => {
    expect(trimWhitespace("hello world")).toBe("hello world");
  });

  it("returns empty string for empty input", () => {
    expect(trimWhitespace("")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(trimWhitespace("   ")).toBe("");
  });

  it("trims tabs and newlines", () => {
    expect(trimWhitespace("\thello world\n")).toBe("hello world");
  });
});
