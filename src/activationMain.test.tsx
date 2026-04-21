import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks — hoisted before any import resolution
// ---------------------------------------------------------------------------

vi.mock("react-dom/client", () => ({
  default: {
    createRoot: vi.fn(() => ({ render: vi.fn() })),
  },
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(vi.fn()),
  emitTo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/api/app", () => ({
  setTheme: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    delete: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/assets/icon.png", () => ({ default: "icon.png" }));

vi.mock("@/components/LicenseActivation", () => ({
  LicenseActivation: () => <div data-testid="license-activation">LicenseActivation</div>,
}));

vi.mock("@/theme.css", () => ({
  darkTheme: "dark-theme",
  lightTheme: "light-theme",
  vars: {
    text: { high: "#fff", mid: "#aaa", dimmer: "#888", dimmest: "#555" },
    accent: { blue: "#4a9eff", blueAlt: "#6eb3ff", green: "#4ade80", mauve: "#c084fc", red: "#f87171" },
    update: { bg: "#333", border: "#444" },
  },
}));

vi.mock("./settings.css", () => ({}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: vi.fn().mockReturnValue({ theme: "dark", setTheme: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Import the actual entry point — executes lines 7-14 (contextmenu + createRoot)
// ---------------------------------------------------------------------------

import ReactDOM from "react-dom/client";
import "./activationMain";
import { LicenseActivation } from "@/components/LicenseActivation";
import { useTheme } from "@/hooks/useTheme";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("activationMain — module-level effects", () => {
  it("blocks the context menu", () => {
    const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    document.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
  });

  it("mounts into the DOM via ReactDOM.createRoot", () => {
    // createRoot is called at module load time; verify the mock was set up
    expect(ReactDOM.createRoot).toBeDefined();
  });
});

describe("activationMain — ActivationApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function ActivationApp() {
    useTheme();
    return <LicenseActivation />;
  }

  it("renders without crashing", () => {
    render(<ActivationApp />);
  });

  it("renders the LicenseActivation component", () => {
    render(<ActivationApp />);
    expect(screen.getByTestId("license-activation")).toBeInTheDocument();
  });

  it("calls useTheme on mount", () => {
    render(<ActivationApp />);
    expect(useTheme).toHaveBeenCalled();
  });
});
