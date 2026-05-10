import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { LicenseActivation } from "@/components/LicenseActivation/index";

const mockInvoke = vi.fn();
const mockOpenUrl = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: (...args: unknown[]) => mockOpenUrl(...args),
}));

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(undefined),
    set: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/assets/icon.png", () => ({ default: "icon.png" }));

vi.mock("./index.css", () => {
  const names = [
    "container", "header", "appIcon", "appName", "appSubtitle",
    "form", "label", "input", "inputError", "errorMsg",
    "activateBtn", "divider",
    "buyRow", "buyBtnPrimary", "buyBtnOutline", "buyCaption",
    "spinAnimation",
    "checkPopAnimation", "checkStrokeAnimation", "ringPulseAnimation", "autoCloseAnimation",
    "celebrationWrap", "receiptBlock", "shortcutTeaser", "shortcutKey", "celebrationCtaBtn", "autoCloseBar",
  ];
  return Object.fromEntries(names.map((n) => [n, n]));
});

vi.mock("@/theme.css", () => ({
  vars: {
    text: { high: "#fff", mid: "#aaa", dimmer: "#888", dimmest: "#555" },
    accent: { blue: "#4a9eff", blueAlt: "#6eb3ff", green: "#4ade80", mauve: "#c084fc", red: "#f87171" },
  },
}));

function renderComponent() {
  return render(createElement(LicenseActivation));
}

describe("LicenseActivation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("default render", () => {
    it("renders app name and subtitle", () => {
      renderComponent();
      expect(screen.getByText("Kurippa")).toBeTruthy();
      expect(screen.getByText("Keyboard-first clipboard manager")).toBeTruthy();
    });

    it("renders the license key input", () => {
      renderComponent();
      expect(screen.getByPlaceholderText("XXXX-XXXX-XXXX-XXXX")).toBeTruthy();
    });

    it("renders the activate button disabled when input is empty", () => {
      renderComponent();
      const btn = screen.getByRole("button", { name: /activate kurippa/i });
      expect(btn).toHaveAttribute("disabled");
    });

    it("renders the Buy Kurippa button", () => {
      renderComponent();
      expect(screen.getByText(/buy kurippa/i)).toBeTruthy();
    });

    it("renders the Free trial button", () => {
      renderComponent();
      expect(screen.getByRole("button", { name: /^free trial$/i })).toBeTruthy();
    });

    it("renders the caption with trial limit note", () => {
      renderComponent();
      expect(screen.getByText(/15 items/i)).toBeTruthy();
    });
  });

  describe("input interaction", () => {
    it("activate button becomes enabled when key is typed", () => {
      renderComponent();
      const input = screen.getByPlaceholderText("XXXX-XXXX-XXXX-XXXX");
      fireEvent.change(input, { target: { value: "ABCD-1234" } });
      const btn = screen.getByRole("button", { name: /activate kurippa/i });
      expect(btn).not.toHaveAttribute("disabled");
    });

    it("activate button stays disabled for whitespace-only input", () => {
      renderComponent();
      const input = screen.getByPlaceholderText("XXXX-XXXX-XXXX-XXXX");
      fireEvent.change(input, { target: { value: "   " } });
      const btn = screen.getByRole("button", { name: /activate kurippa/i });
      expect(btn).toHaveAttribute("disabled");
    });
  });

  describe("activation success", () => {
    it("calls activate_license_cmd with trimmed key on button click", async () => {
      mockInvoke.mockResolvedValue(undefined);
      renderComponent();
      const input = screen.getByPlaceholderText("XXXX-XXXX-XXXX-XXXX");
      fireEvent.change(input, { target: { value: "  ABCD-1234  " } });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /activate kurippa/i }));
      });
      expect(mockInvoke).toHaveBeenCalledWith("activate_license_cmd", { key: "ABCD-1234" });
    });

    it("calls activate_license_cmd on Enter key press", async () => {
      mockInvoke.mockResolvedValue(undefined);
      renderComponent();
      const input = screen.getByPlaceholderText("XXXX-XXXX-XXXX-XXXX");
      fireEvent.change(input, { target: { value: "KEY" } });
      await act(async () => {
        fireEvent.keyDown(input, { key: "Enter" });
      });
      expect(mockInvoke).toHaveBeenCalledWith("activate_license_cmd", { key: "KEY" });
    });
  });

  describe("activation error states", () => {
    it("shows invalid key message for InvalidKey error", async () => {
      mockInvoke.mockRejectedValue("InvalidKey");
      renderComponent();
      const input = screen.getByPlaceholderText("XXXX-XXXX-XXXX-XXXX");
      fireEvent.change(input, { target: { value: "BAD-KEY" } });
      fireEvent.click(screen.getByRole("button", { name: /activate kurippa/i }));
      await screen.findByText(/invalid license key/i);
    });

    it("shows device limit message for DeviceLimitReached error", async () => {
      mockInvoke.mockRejectedValue("DeviceLimitReached");
      renderComponent();
      const input = screen.getByPlaceholderText("XXXX-XXXX-XXXX-XXXX");
      fireEvent.change(input, { target: { value: "KEY" } });
      fireEvent.click(screen.getByRole("button", { name: /activate kurippa/i }));
      await screen.findByText(/device limit reached/i);
    });

    it("shows network error message for NetworkError error", async () => {
      mockInvoke.mockRejectedValue("NetworkError: connection refused");
      renderComponent();
      const input = screen.getByPlaceholderText("XXXX-XXXX-XXXX-XXXX");
      fireEvent.change(input, { target: { value: "KEY" } });
      fireEvent.click(screen.getByRole("button", { name: /activate kurippa/i }));
      await screen.findByText(/could not connect/i);
    });

    it("shows generic message for unknown error", async () => {
      mockInvoke.mockRejectedValue("Unknown: something weird");
      renderComponent();
      const input = screen.getByPlaceholderText("XXXX-XXXX-XXXX-XXXX");
      fireEvent.change(input, { target: { value: "KEY" } });
      fireEvent.click(screen.getByRole("button", { name: /activate kurippa/i }));
      await screen.findByText(/activation failed/i);
    });

    it("clears error when key input changes", async () => {
      mockInvoke.mockRejectedValue("InvalidKey");
      renderComponent();
      const input = screen.getByPlaceholderText("XXXX-XXXX-XXXX-XXXX");
      fireEvent.change(input, { target: { value: "BAD" } });
      fireEvent.click(screen.getByRole("button", { name: /activate kurippa/i }));
      await screen.findByText(/invalid license key/i);
      fireEvent.change(input, { target: { value: "NEW" } });
      expect(screen.queryByText(/invalid license key/i)).toBeNull();
    });
  });

  describe("free trial", () => {
    it("calls set_free_trial_cmd when Free trial is clicked", async () => {
      mockInvoke.mockResolvedValue(undefined);
      renderComponent();
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /^free trial$/i }));
      });
      expect(mockInvoke).toHaveBeenCalledWith("set_free_trial_cmd");
    });
  });

  describe("buy button", () => {
    it("calls openUrl when Buy Kurippa is clicked", () => {
      mockOpenUrl.mockResolvedValue(undefined);
      renderComponent();
      fireEvent.click(screen.getByText(/buy kurippa/i));
      expect(mockOpenUrl).toHaveBeenCalledWith("https://tinyforge.store/l/kurippa");
    });
  });

  describe("loading spinner", () => {
    it("shows 'Activating…' text while request is in flight", async () => {
      // Never resolves — keep loading state indefinitely
      mockInvoke.mockReturnValue(new Promise(() => {}));
      renderComponent();
      const input = screen.getByPlaceholderText("XXXX-XXXX-XXXX-XXXX");
      fireEvent.change(input, { target: { value: "SOME-KEY" } });
      fireEvent.click(screen.getByRole("button", { name: /activate kurippa/i }));
      // Button text changes to loading indicator
      await screen.findByText(/activating…/i);
    });

    it("activate button is disabled while loading", async () => {
      mockInvoke.mockReturnValue(new Promise(() => {}));
      renderComponent();
      const input = screen.getByPlaceholderText("XXXX-XXXX-XXXX-XXXX");
      fireEvent.change(input, { target: { value: "SOME-KEY" } });
      fireEvent.click(screen.getByRole("button", { name: /activate kurippa/i }));
      await screen.findByText(/activating…/i);
      const btn = screen.getByRole("button", { name: /activating…/i });
      expect(btn).toHaveAttribute("disabled");
    });
  });

  describe("activation success — CelebrationBody", () => {
    it("renders 'You're activated' after successful activation", async () => {
      const details = {
        planName: "Kurippa",
        emailMasked: "h•••@test.com",
        deviceCount: 1,
        deviceLimit: 3,
        expiresLabel: "Lifetime",
      };
      mockInvoke.mockResolvedValue(details);
      renderComponent();
      const input = screen.getByPlaceholderText("XXXX-XXXX-XXXX-XXXX");
      fireEvent.change(input, { target: { value: "VALID-KEY" } });
      fireEvent.click(screen.getByRole("button", { name: /activate kurippa/i }));
      await screen.findByText(/you're activated/i);
    });

    it("renders plan name and masked email from activation details", async () => {
      const details = {
        planName: "Kurippa",
        emailMasked: "h•••@test.com",
        deviceCount: 1,
        deviceLimit: 3,
        expiresLabel: "Lifetime",
      };
      mockInvoke.mockResolvedValue(details);
      renderComponent();
      const input = screen.getByPlaceholderText("XXXX-XXXX-XXXX-XXXX");
      fireEvent.change(input, { target: { value: "VALID-KEY" } });
      fireEvent.click(screen.getByRole("button", { name: /activate kurippa/i }));
      await screen.findByText("h•••@test.com");
      expect(screen.getByText("Kurippa")).toBeTruthy();
      expect(screen.getByText("Lifetime")).toBeTruthy();
    });

    it("clicking 'Start using Kurippa' calls finish_activation_cmd", async () => {
      const details = {
        planName: "Kurippa",
        emailMasked: "h•••@test.com",
        deviceCount: 1,
        deviceLimit: 3,
        expiresLabel: "Lifetime",
      };
      mockInvoke
        .mockResolvedValueOnce(details) // activate_license_cmd
        .mockResolvedValue(undefined); // finish_activation_cmd

      renderComponent();
      const input = screen.getByPlaceholderText("XXXX-XXXX-XXXX-XXXX");
      fireEvent.change(input, { target: { value: "VALID-KEY" } });
      fireEvent.click(screen.getByRole("button", { name: /activate kurippa/i }));
      await screen.findByText(/you're activated/i);

      fireEvent.click(screen.getByRole("button", { name: /start using kurippa/i }));
      expect(mockInvoke).toHaveBeenCalledWith("finish_activation_cmd");
    });
  });

  describe("visibilitychange reset", () => {
    it("resets to form state when visibility changes to visible after celebration", async () => {
      const details = {
        planName: "Kurippa",
        emailMasked: "h•••@test.com",
        deviceCount: 1,
        deviceLimit: 3,
        expiresLabel: "Lifetime",
      };
      mockInvoke.mockResolvedValue(details);
      renderComponent();
      const input = screen.getByPlaceholderText("XXXX-XXXX-XXXX-XXXX");
      fireEvent.change(input, { target: { value: "VALID-KEY" } });
      fireEvent.click(screen.getByRole("button", { name: /activate kurippa/i }));
      await screen.findByText(/you're activated/i);

      // Simulate window becoming visible again
      Object.defineProperty(document, "visibilityState", { value: "visible", writable: true, configurable: true });
      fireEvent(document, new Event("visibilitychange"));

      // Form should reappear
      await screen.findByPlaceholderText("XXXX-XXXX-XXXX-XXXX");
    });
  });
});
