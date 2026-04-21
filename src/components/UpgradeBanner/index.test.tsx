import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { UpgradeBanner } from "@/components/UpgradeBanner/index";

const mockOpenUrl = vi.fn().mockResolvedValue(undefined);

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: (...args: unknown[]) => mockOpenUrl(...args),
}));

vi.mock("./index.css", () => ({
  upgradeBanner: "upgradeBanner",
  bannerMessage: "bannerMessage",
  upgradeLink: "upgradeLink",
}));

describe("UpgradeBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("default render", () => {
    it("renders the feature name in the message", () => {
      render(createElement(UpgradeBanner, { feature: "Multi-paste", onDismiss: vi.fn() }));
      expect(screen.getByText(/multi-paste/i)).toBeTruthy();
    });

    it("renders the Upgrade link", () => {
      render(createElement(UpgradeBanner, { feature: "Multi-paste", onDismiss: vi.fn() }));
      expect(screen.getByRole("button", { name: /upgrade/i })).toBeTruthy();
    });
  });

  describe("auto-dismiss after 3s", () => {
    it("calls onDismiss after 3000ms", () => {
      const onDismiss = vi.fn();
      render(createElement(UpgradeBanner, { feature: "Multi-paste", onDismiss }));
      expect(onDismiss).not.toHaveBeenCalled();
      act(() => { vi.advanceTimersByTime(3000); });
      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it("does not call onDismiss before 3000ms", () => {
      const onDismiss = vi.fn();
      render(createElement(UpgradeBanner, { feature: "Multi-paste", onDismiss }));
      act(() => { vi.advanceTimersByTime(2999); });
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe("Esc key dismisses", () => {
    it("calls onDismiss when Escape is pressed", () => {
      const onDismiss = vi.fn();
      render(createElement(UpgradeBanner, { feature: "Multi-paste", onDismiss }));
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it("does not call onDismiss for other keys", () => {
      const onDismiss = vi.fn();
      render(createElement(UpgradeBanner, { feature: "Multi-paste", onDismiss }));
      fireEvent.keyDown(window, { key: "Enter" });
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe("upgrade link", () => {
    it("calls openUrl when Upgrade is clicked", () => {
      render(createElement(UpgradeBanner, { feature: "Multi-paste", onDismiss: vi.fn() }));
      fireEvent.click(screen.getByRole("button", { name: /upgrade/i }));
      expect(mockOpenUrl).toHaveBeenCalledWith("https://tinyforge.store/l/kurippa");
    });
  });
});
