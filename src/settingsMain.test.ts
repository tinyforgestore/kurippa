import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.doMock (non-hoisted) is used inside beforeEach so variables can be
// referenced before they're assigned, and vi.resetModules() ensures the
// module side-effect re-runs fresh on each test.

describe("settings-main entry point", () => {
  let mockCreateRoot: ReturnType<typeof vi.fn>;
  let mockRender: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = '<div id="root"></div>';

    mockRender = vi.fn();
    mockCreateRoot = vi.fn(() => ({ render: mockRender }));

    vi.doMock("react-dom/client", () => ({
      default: { createRoot: mockCreateRoot },
    }));
    vi.doMock("@/components/Settings", () => ({
      SettingsApp: () => null,
    }));

    await import("@/settingsMain");
  });

  it("calls ReactDOM.createRoot with the #root element", () => {
    expect(mockCreateRoot).toHaveBeenCalledWith(document.getElementById("root"));
  });

  it("calls render once", () => {
    expect(mockRender).toHaveBeenCalledOnce();
  });
});
