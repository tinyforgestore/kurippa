import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { Footer } from "@/components/Footer/index";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("lucide-react", () => ({
  Settings: () => null,
  Trash2: () => null,
  X: () => null,
}));

vi.mock("./index.css", () => ({
  footer: "footer",
  footerButton: "footerButton",
  footerHint: "footerHint",
  footerDivider: "footerDivider",
  confirmRow: "confirmRow",
  confirmLabel: "confirmLabel",
  confirmYesButton: "confirmYesButton",
  confirmCancelButton: "confirmCancelButton",
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

function makeProps(overrides: Partial<Parameters<typeof Footer>[0]> = {}) {
  return {
    showConfirm: false,
    onRequestClear: vi.fn(),
    onConfirmClear: vi.fn(),
    onCancelClear: vi.fn(),
    ...overrides,
  };
}

describe("Footer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normal state (showConfirm: false)", () => {
    it("renders Settings, Clear, and Quit buttons", () => {
      render(createElement(Footer, makeProps()));
      expect(screen.getByText("Settings")).toBeTruthy();
      expect(screen.getByText("Clear")).toBeTruthy();
      expect(screen.getByText("Quit")).toBeTruthy();
    });

    it("does not render confirmation message", () => {
      render(createElement(Footer, makeProps()));
      expect(screen.queryByText("Clear all history?")).toBeNull();
    });

    it("Clear button calls onRequestClear", () => {
      const onRequestClear = vi.fn();
      render(createElement(Footer, makeProps({ onRequestClear })));
      fireEvent.click(screen.getByText("Clear").closest("button")!);
      expect(onRequestClear).toHaveBeenCalledOnce();
    });

    it("Settings button invokes open_settings_window", () => {
      render(createElement(Footer, makeProps()));
      fireEvent.click(screen.getByText("Settings").closest("button")!);
      expect(mockInvoke).toHaveBeenCalledWith("open_settings_window");
    });

    it("Quit button invokes quit_app", () => {
      render(createElement(Footer, makeProps()));
      fireEvent.click(screen.getByText("Quit").closest("button")!);
      expect(mockInvoke).toHaveBeenCalledWith("quit_app");
    });
  });

  describe("confirm state (showConfirm: true)", () => {
    it("renders confirmation label and Clear/Cancel buttons", () => {
      render(createElement(Footer, makeProps({ showConfirm: true })));
      expect(screen.getByText("Clear all history?")).toBeTruthy();
      expect(screen.getByText("Clear")).toBeTruthy();
      expect(screen.getByText("Cancel")).toBeTruthy();
    });

    it("does not render Settings or Quit buttons", () => {
      render(createElement(Footer, makeProps({ showConfirm: true })));
      expect(screen.queryByText("Settings")).toBeNull();
      expect(screen.queryByText("Quit")).toBeNull();
    });

    it("Clear button calls onConfirmClear", () => {
      const onConfirmClear = vi.fn();
      render(createElement(Footer, makeProps({ showConfirm: true, onConfirmClear })));
      fireEvent.click(screen.getByText("Clear"));
      expect(onConfirmClear).toHaveBeenCalledOnce();
    });

    it("Cancel button calls onCancelClear", () => {
      const onCancelClear = vi.fn();
      render(createElement(Footer, makeProps({ showConfirm: true, onCancelClear })));
      fireEvent.click(screen.getByText("Cancel"));
      expect(onCancelClear).toHaveBeenCalledOnce();
    });

    it("does not invoke any Tauri command when Clear is clicked", () => {
      const onConfirmClear = vi.fn();
      render(createElement(Footer, makeProps({ showConfirm: true, onConfirmClear })));
      fireEvent.click(screen.getByText("Clear"));
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("platform-specific shortcut hints", () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(
      window.navigator,
      "platform"
    );

    function setPlatform(value: string) {
      Object.defineProperty(window.navigator, "platform", {
        configurable: true,
        get: () => value,
      });
    }

    beforeEach(() => {
      vi.resetModules();
    });

    afterEach(() => {
      if (originalPlatform) {
        Object.defineProperty(window.navigator, "platform", originalPlatform);
      }
    });

    it("renders shortcut hints on macOS", async () => {
      setPlatform("MacIntel");
      const { Footer: MacFooter } = await import("@/components/Footer/index");
      render(createElement(MacFooter, makeProps()));
      expect(screen.getByText("⌘,")).toBeTruthy();
      expect(screen.getByText("⌥⌘⌫")).toBeTruthy();
      expect(screen.getByText("⌘Q")).toBeTruthy();
    });

    it("hides shortcut hints on Windows", async () => {
      setPlatform("Win32");
      const { Footer: WinFooter } = await import("@/components/Footer/index");
      render(createElement(WinFooter, makeProps()));
      expect(screen.queryByText("Ctrl+,")).toBeNull();
      expect(screen.queryByText("Alt+Ctrl+Backspace")).toBeNull();
      expect(screen.queryByText("Ctrl+Q")).toBeNull();
      // Action labels still visible
      expect(screen.getByText("Settings")).toBeTruthy();
      expect(screen.getByText("Clear")).toBeTruthy();
      expect(screen.getByText("Quit")).toBeTruthy();
    });

    it("hides shortcut hints on Linux", async () => {
      setPlatform("Linux x86_64");
      const { Footer: LinuxFooter } = await import("@/components/Footer/index");
      render(createElement(LinuxFooter, makeProps()));
      expect(screen.queryByText("Ctrl+,")).toBeNull();
      expect(screen.queryByText("Alt+Ctrl+Backspace")).toBeNull();
      expect(screen.queryByText("Ctrl+Q")).toBeNull();
      expect(screen.getByText("Settings")).toBeTruthy();
    });
  });
});
