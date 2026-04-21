import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { UpdateBanner } from "@/components/UpdateBanner/index";

// Mock vanilla-extract styles
vi.mock("./index.css", () => ({
  updateBanner: "updateBanner",
  updateMessage: "updateMessage",
  updateActions: "updateActions",
  updateInstall: "updateInstall",
  updateDismiss: "updateDismiss",
}));

function makeProps(overrides: Partial<Parameters<typeof UpdateBanner>[0]> = {}) {
  return {
    version: "1.2.3",
    onInstall: vi.fn(),
    onDismiss: vi.fn(),
    ...overrides,
  };
}

describe("UpdateBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the version number in the message", () => {
      render(createElement(UpdateBanner, makeProps()));
      expect(screen.getByText("Kurippa 1.2.3 available")).toBeTruthy();
    });

    it("renders the Install button", () => {
      render(createElement(UpdateBanner, makeProps()));
      expect(screen.getByRole("button", { name: "Install" })).toBeTruthy();
    });

    it("renders the dismiss button (✕)", () => {
      render(createElement(UpdateBanner, makeProps()));
      expect(screen.getByRole("button", { name: "✕" })).toBeTruthy();
    });

    it("renders with different version strings", () => {
      render(createElement(UpdateBanner, makeProps({ version: "2.0.0-beta.1" })));
      expect(screen.getByText("Kurippa 2.0.0-beta.1 available")).toBeTruthy();
    });
  });

  describe("button interactions", () => {
    it("clicking Install calls onInstall", () => {
      const onInstall = vi.fn();
      render(createElement(UpdateBanner, makeProps({ onInstall })));
      fireEvent.click(screen.getByRole("button", { name: "Install" }));
      expect(onInstall).toHaveBeenCalledOnce();
    });

    it("clicking ✕ calls onDismiss", () => {
      const onDismiss = vi.fn();
      render(createElement(UpdateBanner, makeProps({ onDismiss })));
      fireEvent.click(screen.getByRole("button", { name: "✕" }));
      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it("clicking Install does not call onDismiss", () => {
      const onInstall = vi.fn();
      const onDismiss = vi.fn();
      render(createElement(UpdateBanner, makeProps({ onInstall, onDismiss })));
      fireEvent.click(screen.getByRole("button", { name: "Install" }));
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it("clicking ✕ does not call onInstall", () => {
      const onInstall = vi.fn();
      const onDismiss = vi.fn();
      render(createElement(UpdateBanner, makeProps({ onInstall, onDismiss })));
      fireEvent.click(screen.getByRole("button", { name: "✕" }));
      expect(onInstall).not.toHaveBeenCalled();
    });
  });
});
