import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { AboutTab } from "@/components/Settings/AboutTab";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockOpenUrl = vi.fn().mockResolvedValue(undefined);
vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: (...args: unknown[]) => mockOpenUrl(...args),
}));

vi.mock("@/assets/icon.png", () => ({ default: "icon.png" }));

vi.mock("./index.css", () => {
  const names = [
    "sectionTitle", "aboutCard", "aboutIcon", "aboutName", "aboutVer",
    "aboutBuilt", "link", "divider", "rowLabel", "rowDesc", "rowError",
    "addBtn", "deactivateConfirmRow",
  ];
  return Object.fromEntries(names.map((n) => [n, n]));
});

vi.mock("@/theme.css", () => ({
  darkTheme: "dark-theme",
  lightTheme: "light-theme",
  vars: {
    text: { high: "#fff", mid: "#aaa", dimmer: "#888", dimmest: "#555" },
    accent: { blue: "#4a9eff", blueAlt: "#6eb3ff", green: "#4ade80", mauve: "#c084fc", red: "#f87171" },
    update: { bg: "#333", border: "#444" },
  },
}));

const mockDeactivate = vi.fn();
const mockOpenActivationWindow = vi.fn();
 
let mockUseLicense = vi.fn();

vi.mock("@/hooks/useLicense", () => ({
  useLicense: (...args: unknown[]) => mockUseLicense(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderAboutTab() {
  return render(createElement(AboutTab));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AboutTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeactivate.mockResolvedValue(undefined);
    mockUseLicense = vi.fn().mockReturnValue({
      mode: "activated",
      licenseInfo: null,
      deactivate: mockDeactivate,
      openActivationWindow: mockOpenActivationWindow,
    });
  });

  describe("basic rendering", () => {
    it("renders the About section title", () => {
      renderAboutTab();
      expect(screen.getByText("About")).toBeTruthy();
    });

    it("renders the app name", () => {
      renderAboutTab();
      expect(screen.getByText("Kurippa")).toBeTruthy();
    });

    it("renders the version string", () => {
      renderAboutTab();
      expect(screen.getByText("Version 0.1.0")).toBeTruthy();
    });

    it("renders the tinyforge link", () => {
      renderAboutTab();
      expect(screen.getByText("tinyforge.store")).toBeTruthy();
    });

    it("clicking tinyforge.store link calls openUrl", () => {
      renderAboutTab();
      fireEvent.click(screen.getByText("tinyforge.store"));
      expect(mockOpenUrl).toHaveBeenCalledWith("https://tinyforge.store");
    });
  });

  describe("license section — activated mode", () => {
    it("shows 'Licensed ✓' when mode is activated", () => {
      renderAboutTab();
      expect(screen.getByText(/licensed/i)).toBeTruthy();
    });

    it("shows 'Deactivate this device' button", () => {
      renderAboutTab();
      expect(screen.getByRole("button", { name: /deactivate this device/i })).toBeTruthy();
    });

    it("shows licenseKey prefix when licenseInfo is provided", () => {
      mockUseLicense.mockReturnValue({
        mode: "activated",
        licenseInfo: { licenseKey: "ABCDE-FGHIJ-KLMNO", instanceId: "i1", activatedAt: "2024-01-01" },
        deactivate: mockDeactivate,
        openActivationWindow: mockOpenActivationWindow,
      });
      renderAboutTab();
      // slices first 9 chars + ••••
      expect(screen.getByText(/ABCDE-FGH••••/)).toBeTruthy();
    });

    it("clicking 'Deactivate this device' shows confirmation row", () => {
      renderAboutTab();
      fireEvent.click(screen.getByRole("button", { name: /deactivate this device/i }));
      expect(screen.getByRole("button", { name: /^deactivate$/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeTruthy();
    });

    it("clicking Cancel in confirm row hides confirm UI", () => {
      renderAboutTab();
      fireEvent.click(screen.getByRole("button", { name: /deactivate this device/i }));
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(screen.queryByRole("button", { name: /^deactivate$/i })).toBeNull();
      expect(screen.getByRole("button", { name: /deactivate this device/i })).toBeTruthy();
    });

    it("clicking Deactivate in confirm row calls deactivate()", async () => {
      renderAboutTab();
      fireEvent.click(screen.getByRole("button", { name: /deactivate this device/i }));
      fireEvent.click(screen.getByRole("button", { name: /^deactivate$/i }));
      await waitFor(() => expect(mockDeactivate).toHaveBeenCalledOnce());
    });

    it("deactivate button shows 'Deactivating…' while in flight", async () => {
      mockDeactivate.mockReturnValue(new Promise(() => {})); // never resolves
      renderAboutTab();
      fireEvent.click(screen.getByRole("button", { name: /deactivate this device/i }));
      fireEvent.click(screen.getByRole("button", { name: /^deactivate$/i }));
      expect(await screen.findByRole("button", { name: /deactivating…/i })).toBeTruthy();
    });
  });

  describe("license section — trial / first_launch mode", () => {
    it("shows 'Free trial' text when mode is trial", () => {
      mockUseLicense.mockReturnValue({
        mode: "trial",
        licenseInfo: null,
        deactivate: mockDeactivate,
        openActivationWindow: mockOpenActivationWindow,
      });
      renderAboutTab();
      expect(screen.getByText(/free trial/i)).toBeTruthy();
    });

    it("shows 'Enter license key' button when mode is trial", () => {
      mockUseLicense.mockReturnValue({
        mode: "trial",
        licenseInfo: null,
        deactivate: mockDeactivate,
        openActivationWindow: mockOpenActivationWindow,
      });
      renderAboutTab();
      expect(screen.getByRole("button", { name: /enter license key/i })).toBeTruthy();
    });

    it("clicking 'Enter license key' calls openActivationWindow", () => {
      mockUseLicense.mockReturnValue({
        mode: "trial",
        licenseInfo: null,
        deactivate: mockDeactivate,
        openActivationWindow: mockOpenActivationWindow,
      });
      renderAboutTab();
      fireEvent.click(screen.getByRole("button", { name: /enter license key/i }));
      expect(mockOpenActivationWindow).toHaveBeenCalledOnce();
    });
  });

  describe("license section — device_limit mode", () => {
    beforeEach(() => {
      mockUseLicense.mockReturnValue({
        mode: "device_limit",
        licenseInfo: null,
        deactivate: mockDeactivate,
        openActivationWindow: mockOpenActivationWindow,
      });
    });

    it("shows device limit error text", () => {
      renderAboutTab();
      expect(screen.getByText(/device limit reached/i)).toBeTruthy();
    });

    it("shows 'Retry activation' button", () => {
      renderAboutTab();
      expect(screen.getByRole("button", { name: /retry activation/i })).toBeTruthy();
    });

    it("clicking 'Retry activation' calls openActivationWindow", () => {
      renderAboutTab();
      fireEvent.click(screen.getByRole("button", { name: /retry activation/i }));
      expect(mockOpenActivationWindow).toHaveBeenCalledOnce();
    });

    it("clicking tinyforge.store/account link calls openUrl", () => {
      renderAboutTab();
      fireEvent.click(screen.getByText("tinyforge.store/account"));
      expect(mockOpenUrl).toHaveBeenCalledWith("https://tinyforge.store/account");
    });
  });
});
