import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { PreviewPanel } from "@/components/PreviewPanel/index";
import { ClipboardItem } from "@/types";
import { flushEffects } from "@/test-utils/flushEffects";

// Mock Tauri core
const mockInvoke = vi.fn();
const mockConvertFileSrc = vi.fn((path: string) => `asset://localhost/${path}`);
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
  convertFileSrc: (path: string) => mockConvertFileSrc(path),
}));

// Mock DOMPurify
vi.mock("dompurify", () => ({
  default: {
    sanitize: (html: string) => html,
  },
}));

function makeItem(overrides: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 1,
    kind: "text",
    text: "hello",
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


describe("PreviewPanel", () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    mockConvertFileSrc.mockClear();
  });

  describe("empty state", () => {
    it("renders 'Select an item to preview' when item is null", () => {
      render(createElement(PreviewPanel, { item: null }));
      expect(screen.getByText("Select an item to preview")).toBeTruthy();
    });
  });

  describe("text item", () => {
    it("renders the full text content in a pre element", () => {
      const item = makeItem({ kind: "text", text: "clipboard text content" });
      render(createElement(PreviewPanel, { item }));
      expect(screen.getByText("clipboard text content")).toBeTruthy();
    });

    it("renders empty string when text is null", () => {
      const item = makeItem({ kind: "text", text: null });
      render(createElement(PreviewPanel, { item }));
      // Should render without throwing
      const pre = document.querySelector("pre");
      expect(pre).toBeTruthy();
      expect(pre?.textContent).toBe("");
    });
  });

  describe("rtf item", () => {
    it("renders sanitized html content", () => {
      const item = makeItem({
        kind: "rtf",
        html: "<p>rich <b>text</b></p>",
        rtf: null,
      });
      render(createElement(PreviewPanel, { item }));
      // The sanitized content is rendered via dangerouslySetInnerHTML
      expect(document.body.innerHTML).toContain("rich");
      expect(document.body.innerHTML).toContain("text");
    });

    it("falls back to rtf field when html is null", () => {
      const item = makeItem({
        kind: "rtf",
        html: null,
        rtf: "rtf content",
      });
      render(createElement(PreviewPanel, { item }));
      expect(document.body.innerHTML).toContain("rtf content");
    });

    it("renders empty string when both html and rtf are null", () => {
      const item = makeItem({ kind: "rtf", html: null, rtf: null });
      render(createElement(PreviewPanel, { item }));
      // renders without throwing
      const panel = document.querySelector("[class]");
      expect(panel).toBeTruthy();
    });
  });

  describe("image item", () => {
    it("shows loading state initially then renders img when invoke resolves", async () => {
      mockInvoke.mockResolvedValueOnce("/app/data/images/abc.png");
      const item = makeItem({ kind: "image", image_path: "abc.png" });
      render(createElement(PreviewPanel, { item }));

      // Initially shows loading state
      expect(screen.getByText("Loading image…")).toBeTruthy();

      await waitFor(() => {
        const img = document.querySelector("img");
        expect(img).toBeTruthy();
      });

      expect(mockInvoke).toHaveBeenCalledWith("get_image_path", { filename: "abc.png" });
      expect(mockConvertFileSrc).toHaveBeenCalledWith("/app/data/images/abc.png");
    });

    it("shows 'Image unavailable' when invoke fails", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("not found"));
      const item = makeItem({ kind: "image", image_path: "missing.png" });
      render(createElement(PreviewPanel, { item }));

      await waitFor(() => {
        expect(screen.getByText("Image unavailable")).toBeTruthy();
      });
    });

    it("extracts filename from full path in image_path", async () => {
      mockInvoke.mockResolvedValueOnce("/app/data/images/foo.png");
      const item = makeItem({ kind: "image", image_path: "/some/path/foo.png" });
      render(createElement(PreviewPanel, { item }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("get_image_path", { filename: "foo.png" });
      });
    });

    it("renders 'Image unavailable' when image_path is null", () => {
      const item = makeItem({ kind: "image", image_path: null });
      render(createElement(PreviewPanel, { item }));
      expect(screen.getByText("Image unavailable")).toBeTruthy();
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("MetaRow", () => {
    it("renders app name from source_app bundle ID", () => {
      const item = makeItem({ source_app: "com.apple.finder" });
      render(createElement(PreviewPanel, { item }));
      expect(screen.getByText("Finder")).toBeTruthy();
    });

    it("does not render app name when source_app is null", () => {
      const item = makeItem({ source_app: null });
      render(createElement(PreviewPanel, { item }));
      expect(screen.queryByText(/Finder/)).toBeNull();
    });

    it("renders char count and size for text items", () => {
      const item = makeItem({ kind: "text", text: "hello world" });
      render(createElement(PreviewPanel, { item }));
      expect(screen.getByText(/11 chars · <1 kb/)).toBeTruthy();
    });

    it("does not render char count for image items", async () => {
      mockInvoke.mockResolvedValueOnce("/app/data/images/1.png");
      const item = makeItem({ kind: "image", text: null, image_path: "1.png" });
      render(createElement(PreviewPanel, { item }));
      expect(screen.queryByText(/chars/)).toBeNull();
      await flushEffects();
    });
  });

  describe("color item", () => {
    it("kind=text with a hex color renders HEX / RGB / HSL labels", () => {
      const item = makeItem({ kind: "text", text: "#ff6600" });
      render(createElement(PreviewPanel, { item }));
      expect(screen.getByText("HEX")).toBeTruthy();
      expect(screen.getByText("RGB")).toBeTruthy();
      expect(screen.getByText("HSL")).toBeTruthy();
    });

    it("kind=rtf with a hex color renders HEX / RGB / HSL labels (not the RTF viewer)", () => {
      const item = makeItem({ kind: "rtf", text: "#ff6600", html: null, rtf: null });
      render(createElement(PreviewPanel, { item }));
      expect(screen.getByText("HEX")).toBeTruthy();
      expect(screen.getByText("RGB")).toBeTruthy();
      expect(screen.getByText("HSL")).toBeTruthy();
    });

    it("kind=text with rgb() color renders HEX label", () => {
      const item = makeItem({ kind: "text", text: "rgb(255, 102, 0)" });
      render(createElement(PreviewPanel, { item }));
      expect(screen.getByText("HEX")).toBeTruthy();
    });
  });

  describe("previewOverride", () => {
    it("renders override text in a <pre> element when previewOverride is a non-empty string", () => {
      const item = makeItem({ kind: "text", text: "original content" });
      render(createElement(PreviewPanel, { item, previewOverride: "override content" }));
      const pre = document.querySelector("pre");
      expect(pre).toBeTruthy();
      expect(pre!.textContent).toBe("override content");
    });

    it("does not render original item text when previewOverride is set", () => {
      const item = makeItem({ kind: "text", text: "original content" });
      render(createElement(PreviewPanel, { item, previewOverride: "override content" }));
      expect(screen.queryByText("original content")).toBeNull();
    });

    it("renders normal item content when previewOverride is null", () => {
      const item = makeItem({ kind: "text", text: "normal content" });
      render(createElement(PreviewPanel, { item, previewOverride: null }));
      expect(screen.getByText("normal content")).toBeTruthy();
    });

    it("renders MetaRow (source_app name) when previewOverride is set", () => {
      const item = makeItem({ kind: "text", text: "original", source_app: "com.apple.finder" });
      render(createElement(PreviewPanel, { item, previewOverride: "override content" }));
      expect(screen.getByText("Finder")).toBeTruthy();
    });
  });
});
