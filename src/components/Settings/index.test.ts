import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { SettingsApp } from "@/components/Settings/index";
import type { AppSettings } from "@/types/settings";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUpdateSettings = vi.fn();
const mockSetLaunchAtLogin = vi.fn();
const mockAddIgnoredApp = vi.fn();
const mockRemoveIgnoredApp = vi.fn();
const mockOpenUrl = vi.fn().mockResolvedValue(undefined);

const DEFAULT_SETTINGS: AppSettings = {
  history_limit: "h500",
  auto_clear_after: "off",
  multi_paste_separator: "newline",
  launch_at_login: false,
  auto_clear_passwords: false,
  ignored_apps: [],
};

let mockSettings: AppSettings | null = DEFAULT_SETTINGS;

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({
    get settings() { return mockSettings; },
    updateSettings: (...args: unknown[]) => mockUpdateSettings(...args),
    setLaunchAtLogin: (...args: unknown[]) => mockSetLaunchAtLogin(...args),
    addIgnoredApp: (...args: unknown[]) => mockAddIgnoredApp(...args),
    removeIgnoredApp: (...args: unknown[]) => mockRemoveIgnoredApp(...args),
  }),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: (...args: unknown[]) => mockOpenUrl(...args),
}));

const mockUseLicense = vi.fn();
vi.mock("@/hooks/useLicense", () => ({
  useLicense: (...args: unknown[]) => mockUseLicense(...args),
}));

vi.mock("@/assets/icon.png", () => ({ default: "icon.png" }));

vi.mock("./index.css", () => {
  const names = [
    "win", "titlebarSpacer", "body", "sidebar", "content",
    "navItem", "navItemActive", "navIcon",
    "sectionTitle", "rowLabel", "rowDesc", "rowError", "row",
    "segControl", "segButton", "segButtonActive",
    "toggleRow", "toggleLabel", "toggleSub", "toggleBase", "toggleOn", "toggleOff",
    "divider", "kbdSection", "kbdRow", "kbdAction", "kbdKeys", "kbd",
    "appList", "appItem", "appRemove", "addBtn",
    "aboutCard", "aboutIcon", "aboutName", "aboutVer", "aboutBuilt", "link",
    "deactivateConfirmRow",
  ];
  return Object.fromEntries(names.map((n) => [n, n]));
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSettings() {
  return render(createElement(SettingsApp));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SettingsApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings = { ...DEFAULT_SETTINGS };
    mockUseLicense.mockReturnValue({
      mode: "activated",
      licenseInfo: null,
      deactivate: vi.fn().mockResolvedValue(undefined),
      activate: vi.fn().mockResolvedValue(undefined),
      openActivationWindow: vi.fn(),
    });
  });

  describe("default tab", () => {
    it("shows General tab body content by default", () => {
      renderSettings();
      // "History limit" only appears inside the GeneralTab body, not the sidebar
      expect(screen.getByText("History limit")).toBeTruthy();
    });

    it("does not show Hotkeys content by default", () => {
      renderSettings();
      // "Open Kurippa" is only rendered inside the Hotkeys tab body
      expect(screen.queryByText("Open Kurippa")).toBeNull();
    });
  });

  describe("tab navigation — click", () => {
    it("clicking Hotkeys tab shows hotkeys content", () => {
      renderSettings();
      fireEvent.click(screen.getByRole("tab", { name: /hotkeys/i }));
      expect(screen.getByText("Open Kurippa")).toBeTruthy();
    });

    it("clicking Privacy tab shows privacy content", () => {
      renderSettings();
      fireEvent.click(screen.getByRole("tab", { name: /privacy/i }));
      expect(screen.getByText("Ignored apps")).toBeTruthy();
    });

    it("clicking About tab shows about content", () => {
      renderSettings();
      fireEvent.click(screen.getByRole("tab", { name: /about/i }));
      expect(screen.getByText("Kurippa")).toBeTruthy();
      expect(screen.getByText("Version 0.1.0")).toBeTruthy();
    });

    it("clicking a tab sets it as selected (aria-selected)", () => {
      renderSettings();
      const hotkeysTab = screen.getByRole("tab", { name: /hotkeys/i });
      fireEvent.click(hotkeysTab);
      expect(hotkeysTab).toHaveAttribute("aria-selected", "true");
    });

    it("previously active tab loses aria-selected on switch", () => {
      renderSettings();
      const generalTab = screen.getByRole("tab", { name: /general/i });
      fireEvent.click(screen.getByRole("tab", { name: /hotkeys/i }));
      expect(generalTab).toHaveAttribute("aria-selected", "false");
    });
  });

  describe("tab navigation — keyboard", () => {
    it("ArrowDown moves from General to Hotkeys", () => {
      renderSettings();
      const tabList = screen.getByRole("tablist");
      fireEvent.keyDown(tabList, { key: "ArrowDown" });
      expect(screen.getByRole("tab", { name: /hotkeys/i })).toHaveAttribute("aria-selected", "true");
    });

    it("ArrowDown from last tab stays on last tab", () => {
      renderSettings();
      const tabList = screen.getByRole("tablist");
      fireEvent.click(screen.getByRole("tab", { name: /about/i }));
      fireEvent.keyDown(tabList, { key: "ArrowDown" });
      expect(screen.getByRole("tab", { name: /about/i })).toHaveAttribute("aria-selected", "true");
    });

    it("ArrowUp moves from Hotkeys back to General", () => {
      renderSettings();
      const tabList = screen.getByRole("tablist");
      fireEvent.click(screen.getByRole("tab", { name: /hotkeys/i }));
      fireEvent.keyDown(tabList, { key: "ArrowUp" });
      expect(screen.getByRole("tab", { name: /general/i })).toHaveAttribute("aria-selected", "true");
    });

    it("ArrowUp from first tab stays on first tab", () => {
      renderSettings();
      const tabList = screen.getByRole("tablist");
      fireEvent.keyDown(tabList, { key: "ArrowUp" });
      expect(screen.getByRole("tab", { name: /general/i })).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("loading state (settings is null)", () => {
    it("renders with DEFAULT_SETTINGS when settings is null", () => {
      mockSettings = null;
      renderSettings();
      // DEFAULT_SETTINGS.history_limit is "h500" — its segmented button should be present
      expect(screen.getByText("500")).toBeTruthy();
    });
  });

  describe("GeneralTab interactions", () => {
    it("clicking a history limit option calls updateSettings", () => {
      renderSettings();
      fireEvent.click(screen.getByText("100"));
      expect(mockUpdateSettings).toHaveBeenCalledWith({ history_limit: "h100" });
    });

    it("clicking an auto-clear option calls updateSettings", () => {
      renderSettings();
      fireEvent.click(screen.getByText("7 days"));
      expect(mockUpdateSettings).toHaveBeenCalledWith({ auto_clear_after: "days7" });
    });

    it("clicking multi-paste separator option calls updateSettings", () => {
      renderSettings();
      fireEvent.click(screen.getByText("Space"));
      expect(mockUpdateSettings).toHaveBeenCalledWith({ multi_paste_separator: "space" });
    });

    it("toggling Launch at login calls setLaunchAtLogin", () => {
      renderSettings();
      // The toggle button is the one with aria-pressed
      const toggleBtn = document.querySelector("button[aria-pressed]")!;
      fireEvent.click(toggleBtn);
      expect(mockSetLaunchAtLogin).toHaveBeenCalledWith(true);
    });
  });

  describe("PrivacyTab interactions", () => {
    it("toggling auto-clear passwords calls updateSettings", () => {
      renderSettings();
      fireEvent.click(screen.getByRole("tab", { name: /privacy/i }));
      const toggleBtn = document.querySelector("button[aria-pressed]")!;
      fireEvent.click(toggleBtn);
      expect(mockUpdateSettings).toHaveBeenCalledWith({ auto_clear_passwords: true });
    });

    it("clicking Add app calls addIgnoredApp", () => {
      renderSettings();
      fireEvent.click(screen.getByRole("tab", { name: /privacy/i }));
      fireEvent.click(screen.getByText("+ Add app"));
      expect(mockAddIgnoredApp).toHaveBeenCalledOnce();
    });

    it("renders ignored apps from settings", () => {
      mockSettings = {
        ...DEFAULT_SETTINGS,
        ignored_apps: [{ bundle_id: "com.test.App", display_name: "Test App" }],
      };
      renderSettings();
      fireEvent.click(screen.getByRole("tab", { name: /privacy/i }));
      expect(screen.getByText("Test App")).toBeTruthy();
    });

    it("clicking remove button calls removeIgnoredApp with bundleId", () => {
      mockSettings = {
        ...DEFAULT_SETTINGS,
        ignored_apps: [{ bundle_id: "com.test.App", display_name: "Test App" }],
      };
      renderSettings();
      fireEvent.click(screen.getByRole("tab", { name: /privacy/i }));
      fireEvent.click(screen.getByTitle("Remove"));
      expect(mockRemoveIgnoredApp).toHaveBeenCalledWith("com.test.App");
    });
  });

  describe("AboutTab interactions", () => {
    it("clicking the tinyforge.store link calls openUrl", () => {
      renderSettings();
      fireEvent.click(screen.getByRole("tab", { name: /about/i }));
      fireEvent.click(screen.getByText("tinyforge.store"));
      expect(mockOpenUrl).toHaveBeenCalledWith("https://tinyforge.store");
    });

    describe('licenseMode === "device_limit"', () => {
      it("shows device limit reached text and retry button", () => {
        mockUseLicense.mockReturnValue({
          mode: "device_limit",
          licenseInfo: null,
          deactivate: vi.fn().mockResolvedValue(undefined),
          activate: vi.fn().mockResolvedValue(undefined),
          openActivationWindow: vi.fn(),
        });
        renderSettings();
        fireEvent.click(screen.getByRole("tab", { name: /about/i }));
        expect(screen.getByText("Device limit reached (3/3)")).toBeTruthy();
        expect(screen.getByRole("button", { name: /retry activation/i })).toBeTruthy();
      });
    });
  });
});
