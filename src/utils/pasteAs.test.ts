import { describe, it, expect } from "vitest";
import { detectItemType, getPasteOptions } from "@/utils/pasteAs";
import { ClipboardItem } from "@/types";

function makeClipboardItem(overrides: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1,
    kind: "text",
    text: "hello world",
    html: null,
    rtf: null,
    image_path: null,
    source_app: null,
    created_at: 1000,
    pinned: false,
    folder_id: null,
    qr_text: null,
    image_width: null,
    image_height: null,
    ...overrides,
  };
}

describe("detectItemType", () => {
  it("returns 'image' for kind=image", () => {
    const item = makeClipboardItem({ kind: "image", text: null, image_path: "1.png" });
    expect(detectItemType(item)).toBe("image");
  });

  it("returns 'url' for an http URL text", () => {
    const item = makeClipboardItem({ text: "https://example.com" });
    expect(detectItemType(item)).toBe("url");
  });

  it("returns 'url' for text that is a URL (URL takes precedence over text kind)", () => {
    const item = makeClipboardItem({ kind: "text", text: "https://example.com/path?q=1" });
    expect(detectItemType(item)).toBe("url");
  });

  it("returns 'color' for a hex color text", () => {
    const item = makeClipboardItem({ text: "#ff6600" });
    expect(detectItemType(item)).toBe("color");
  });

  it("returns 'rtf' for kind=rtf with non-url, non-color text", () => {
    const item = makeClipboardItem({ kind: "rtf", text: "hello" });
    expect(detectItemType(item)).toBe("rtf");
  });

  it("returns 'file-path' for a unix absolute path", () => {
    const item = makeClipboardItem({ text: "/Users/willy/document.pdf" });
    expect(detectItemType(item)).toBe("file-path");
  });

  it("returns 'file-path' for a home-relative path", () => {
    const item = makeClipboardItem({ text: "~/Desktop/file.txt" });
    expect(detectItemType(item)).toBe("file-path");
  });

  it("returns 'file-path' for a Windows path", () => {
    const item = makeClipboardItem({ text: "C:\\Users\\willy\\doc.txt" });
    expect(detectItemType(item)).toBe("file-path");
  });

  it("returns 'text' for plain text", () => {
    const item = makeClipboardItem({ kind: "text", text: "hello world" });
    expect(detectItemType(item)).toBe("text");
  });
});

describe("getPasteOptions", () => {
  describe("image items", () => {
    it("returns one option when image_path is set and no file path", () => {
      const item = makeClipboardItem({ id: 42, kind: "image", text: null, image_path: "42.png" });
      const options = getPasteOptions(item);
      expect(options).toHaveLength(1);
      expect(options[0].label).toBe("Paste as image");
      expect(options[0].action).toEqual({ kind: "paste-image", imageFilename: "42.png", itemId: 42 });
    });

    it("returns three options when image has a file path (Finder image)", () => {
      const item = makeClipboardItem({ id: 42, kind: "image", text: "/Users/willy/photo.jpg", image_path: "42.png" });
      const options = getPasteOptions(item);
      expect(options).toHaveLength(3);
    });

    it("second option for Finder image is Paste as file path", () => {
      const item = makeClipboardItem({ id: 42, kind: "image", text: "/Users/willy/photo.jpg", image_path: "42.png" });
      const options = getPasteOptions(item);
      expect(options[1].label).toBe("Paste as file path");
      expect(options[1].action).toEqual({ kind: "paste-text", text: "/Users/willy/photo.jpg", itemId: 42 });
    });

    it("third option for Finder image is Paste as filename", () => {
      const item = makeClipboardItem({ id: 42, kind: "image", text: "/Users/willy/photo.jpg", image_path: "42.png" });
      const options = getPasteOptions(item);
      expect(options[2].label).toBe("Paste as filename  photo.jpg");
      expect(options[2].action).toEqual({ kind: "paste-text", text: "photo.jpg", itemId: 42 });
    });

    it("returns zero options when image_path is null", () => {
      const item = makeClipboardItem({ kind: "image", text: null, image_path: null });
      const options = getPasteOptions(item);
      expect(options).toHaveLength(0);
    });

    it("appends a QR text option when qr_text is set (short text shown in full)", () => {
      const item = makeClipboardItem({ id: 42, kind: "image", text: null, image_path: "42.png", qr_text: "https://example.com" });
      const options = getPasteOptions(item);
      expect(options).toHaveLength(2);
      expect(options[1].label).toBe("Paste as QR text  https://example.com");
      expect(options[1].action).toEqual({ kind: "paste-text", text: "https://example.com", itemId: 42 });
    });

    it("truncates QR text preview to 30 chars + ellipsis when qr_text is longer than 30", () => {
      const longText = "a".repeat(31);
      const item = makeClipboardItem({ id: 42, kind: "image", text: null, image_path: "42.png", qr_text: longText });
      const options = getPasteOptions(item);
      expect(options[1].label).toBe(`Paste as QR text  ${"a".repeat(30)}…`);
      expect(options[1].action).toEqual({ kind: "paste-text", text: longText, itemId: 42 });
    });
  });

  describe("url items", () => {
    it("returns 6 options for a URL (5 single-line + Markdown link)", () => {
      const item = makeClipboardItem({ id: 5, text: "https://example.com" });
      const options = getPasteOptions(item);
      expect(options).toHaveLength(6);
    });

    it("first option is Paste as plain text", () => {
      const item = makeClipboardItem({ id: 5, text: "https://example.com" });
      const options = getPasteOptions(item);
      expect(options[0].label).toBe("Paste as plain text");
      expect(options[0].action).toEqual({ kind: "paste-text", text: "https://example.com", itemId: 5 });
    });

    it("second option is Paste wrapped in code block", () => {
      const item = makeClipboardItem({ id: 5, text: "https://example.com" });
      const options = getPasteOptions(item);
      expect(options[1].label).toBe("Paste wrapped in code block");
      expect(options[1].action).toEqual({ kind: "paste-text", text: "```\nhttps://example.com\n```", itemId: 5 });
    });

    it("last option is Paste as Markdown link", () => {
      const item = makeClipboardItem({ id: 5, text: "https://example.com" });
      const options = getPasteOptions(item);
      expect(options[5].label).toBe("Paste as Markdown link ([example.com](…))");
      expect(options[5].action).toEqual({ kind: "paste-text", text: "[example.com](https://example.com)", itemId: 5 });
    });
  });

  describe("color items", () => {
    it("returns four options for a hex color", () => {
      const item = makeClipboardItem({ text: "#ff6600" });
      const options = getPasteOptions(item);
      expect(options).toHaveLength(4);
    });

    it("first option action.text is the original color string", () => {
      const item = makeClipboardItem({ text: "#ff6600" });
      const options = getPasteOptions(item);
      expect((options[0].action as { kind: "paste-text"; text: string }).text).toBe("#ff6600");
    });

    it("second option action.text is the HEX representation", () => {
      const item = makeClipboardItem({ text: "#ff6600" });
      const options = getPasteOptions(item);
      expect((options[1].action as { kind: "paste-text"; text: string }).text).toBe("#ff6600");
    });

    it("third option action.text is the RGB representation", () => {
      const item = makeClipboardItem({ text: "#ff6600" });
      const options = getPasteOptions(item);
      expect((options[2].action as { kind: "paste-text"; text: string }).text).toBe("rgb(255, 102, 0)");
    });

    it("fourth option action.text is the HSL representation", () => {
      const item = makeClipboardItem({ text: "#ff6600" });
      const options = getPasteOptions(item);
      expect((options[3].action as { kind: "paste-text"; text: string }).text).toBe("hsl(24, 100%, 50%)");
    });
  });

  describe("rtf items", () => {
    it("returns two options for rtf kind", () => {
      const item = makeClipboardItem({ id: 7, kind: "rtf", text: "hello" });
      const options = getPasteOptions(item);
      expect(options).toHaveLength(2);
    });

    it("first option is Paste as rich text", () => {
      const item = makeClipboardItem({ id: 7, kind: "rtf", text: "hello" });
      const options = getPasteOptions(item);
      expect(options[0].label).toBe("Paste as rich text");
      expect(options[0].action).toEqual({ kind: "paste-rich", text: "hello", itemId: 7 });
    });

    it("second option is Paste as plain text", () => {
      const item = makeClipboardItem({ id: 7, kind: "rtf", text: "hello" });
      const options = getPasteOptions(item);
      expect(options[1].label).toBe("Paste as plain text");
      expect(options[1].action).toEqual({ kind: "paste-text", text: "hello", itemId: 7 });
    });
  });

  describe("file-path items", () => {
    it("returns 6 options for a unix file path (5 single-line + filename only)", () => {
      const item = makeClipboardItem({ id: 9, text: "/Users/willy/document.pdf" });
      const options = getPasteOptions(item);
      expect(options).toHaveLength(6);
    });

    it("first option is Paste as plain text", () => {
      const item = makeClipboardItem({ id: 9, text: "/Users/willy/document.pdf" });
      const options = getPasteOptions(item);
      expect(options[0].label).toBe("Paste as plain text");
      expect(options[0].action).toEqual({ kind: "paste-text", text: "/Users/willy/document.pdf", itemId: 9 });
    });

    it("second option is Paste wrapped in code block", () => {
      const item = makeClipboardItem({ id: 9, text: "/Users/willy/document.pdf" });
      const options = getPasteOptions(item);
      expect(options[1].label).toBe("Paste wrapped in code block");
      expect(options[1].action).toEqual({ kind: "paste-text", text: "```\n/Users/willy/document.pdf\n```", itemId: 9 });
    });

    it("last option is Paste as filename only", () => {
      const item = makeClipboardItem({ id: 9, text: "/Users/willy/document.pdf" });
      const options = getPasteOptions(item);
      expect(options[5].label).toBe("Paste as filename only  document.pdf");
      expect(options[5].action).toEqual({ kind: "paste-text", text: "document.pdf", itemId: 9 });
    });
  });

  describe("plain text items", () => {
    it("returns 5 top-level options for single-line plain text", () => {
      const item = makeClipboardItem({ id: 3, kind: "text", text: "hello world" });
      const options = getPasteOptions(item);
      expect(options).toHaveLength(5);
    });

    it("first option is Paste as plain text", () => {
      const item = makeClipboardItem({ id: 3, kind: "text", text: "hello world" });
      const options = getPasteOptions(item);
      expect(options[0].label).toBe("Paste as plain text");
      expect(options[0].action).toEqual({ kind: "paste-text", text: "hello world", itemId: 3 });
    });

    it("second option is Paste wrapped in code block", () => {
      const item = makeClipboardItem({ id: 3, kind: "text", text: "hello world" });
      const options = getPasteOptions(item);
      expect(options[1].label).toBe("Paste wrapped in code block");
      expect(options[1].action).toEqual({ kind: "paste-text", text: "```\nhello world\n```", itemId: 3 });
    });

    it("third option is Change case submenu entry (no action)", () => {
      const item = makeClipboardItem({ id: 3, kind: "text", text: "hello world" });
      const options = getPasteOptions(item);
      expect(options[2].label).toBe("Change case");
      expect(options[2].action).toBeUndefined();
      expect(options[2].submenu).toBeDefined();
    });

    it("Change case submenu has 7 items", () => {
      const item = makeClipboardItem({ id: 3, kind: "text", text: "hello world" });
      const options = getPasteOptions(item);
      expect(options[2].submenu).toHaveLength(7);
    });

    it("Change case submenu first item is UPPERCASE", () => {
      const item = makeClipboardItem({ id: 3, kind: "text", text: "hello world" });
      const options = getPasteOptions(item);
      const sub = options[2].submenu!;
      expect(sub[0].label).toBe("UPPERCASE");
      expect(sub[0].action).toEqual({ kind: "paste-text", text: "HELLO WORLD", itemId: 3 });
    });

    it("Change case submenu contains lowercase, Title Case, PascalCase, camelCase, snake_case, slug", () => {
      const item = makeClipboardItem({ id: 3, kind: "text", text: "hello world" });
      const options = getPasteOptions(item);
      const labels = options[2].submenu!.map((o) => o.label);
      expect(labels).toEqual(["UPPERCASE", "lowercase", "Title Case", "PascalCase", "camelCase", "snake_case", "slug"]);
    });

    it("fourth option is Wrap with… submenu entry (no action)", () => {
      const item = makeClipboardItem({ id: 3, kind: "text", text: "hello world" });
      const options = getPasteOptions(item);
      expect(options[3].label).toBe("Wrap with\u2026");
      expect(options[3].action).toBeUndefined();
      expect(options[3].submenu).toBeDefined();
    });

    it("Wrap with submenu has 6 items", () => {
      const item = makeClipboardItem({ id: 3, kind: "text", text: "hello world" });
      const options = getPasteOptions(item);
      expect(options[3].submenu).toHaveLength(6);
    });

    it("Wrap with submenu items all have shortcutKey", () => {
      const item = makeClipboardItem({ id: 3, kind: "text", text: "hello world" });
      const options = getPasteOptions(item);
      const sub = options[3].submenu!;
      expect(sub.map((o) => o.shortcutKey)).toEqual(['"', "'", "`", "(", "[", "{"]);
    });

    it("fifth option is Trim whitespace with badge '0'", () => {
      const item = makeClipboardItem({ id: 3, kind: "text", text: "  hello world  " });
      const options = getPasteOptions(item);
      expect(options[4].label).toBe("Trim whitespace");
      expect(options[4].badge).toBe("0");
      expect(options[4].action).toEqual({ kind: "paste-text", text: "hello world", itemId: 3 });
    });

    it("returns 5 options for multi-line plain text", () => {
      const item = makeClipboardItem({ id: 4, kind: "text", text: "line one\nline two" });
      const options = getPasteOptions(item);
      expect(options).toHaveLength(5);
    });
  });
});
