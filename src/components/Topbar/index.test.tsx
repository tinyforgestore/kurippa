import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { Topbar } from "@/components/Topbar/index";

vi.mock("@/assets/icon.png", () => ({ default: "icon-dark.png" }));
vi.mock("@/assets/icon-light.png", () => ({ default: "icon-light.png" }));

vi.mock("@/components/Topbar/index.css", () => ({
  topbar: "topbar",
  topbarIcon: "topbarIcon",
  search: "search",
  licenseChip: "licenseChip",
  crownIcon: "crownIcon",
}));


function renderTopbar(licenseMode: "activated" | "trial" | "first_launch" | "device_limit" | undefined, onOpenActivation = vi.fn()) {
  return render(
    createElement(Topbar, {
      inputRef: { current: null },
      query: "",
      onQueryChange: vi.fn(),
      onDismiss: vi.fn(),
      licenseMode,
      onOpenActivation,
    })
  );
}

describe("Topbar — license states", () => {
  describe('licenseMode === "activated"', () => {
    it("renders the Crown icon", () => {
      renderTopbar("activated");
      expect(screen.getByTestId("crown-icon")).toBeTruthy();
    });

    it("does not render Free Trial text", () => {
      renderTopbar("activated");
      expect(screen.queryByText("Free Trial")).toBeNull();
    });
  });

  describe('licenseMode === "trial"', () => {
    it("renders Free Trial text", () => {
      renderTopbar("trial");
      expect(screen.getByRole("button", { name: /free.*trial/i })).toBeTruthy();
    });

    it("calls onOpenActivation when Free Trial button is clicked", () => {
      const onOpenActivation = vi.fn();
      renderTopbar("trial", onOpenActivation);
      fireEvent.click(screen.getByRole("button", { name: /free.*trial/i }));
      expect(onOpenActivation).toHaveBeenCalledOnce();
    });

    it("does not render the Crown icon", () => {
      renderTopbar("trial");
      expect(screen.queryByTestId("crown-icon")).toBeNull();
    });
  });

  describe('licenseMode === "first_launch"', () => {
    it("does not render the Crown icon", () => {
      renderTopbar("first_launch");
      expect(screen.queryByTestId("crown-icon")).toBeNull();
    });

    it("does not render Free Trial text", () => {
      renderTopbar("first_launch");
      expect(screen.queryByText("Free Trial")).toBeNull();
    });
  });
});
