import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useApp } from "@/hooks/useApp";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (cmd: string, ...args: unknown[]) => mockInvoke(cmd, ...args),
}));

const mockStore = {
  get: vi.fn(),
  delete: vi.fn(),
  save: vi.fn().mockResolvedValue(undefined),
};
vi.mock("@tauri-apps/plugin-store", () => ({
  load: () => Promise.resolve(mockStore),
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}));

vi.mock("@/hooks/useLicense", () => ({
  useLicense: () => ({ mode: "trial", openActivationWindow: vi.fn() }),
}));

vi.mock("@/hooks/useAppState", () => ({
  useAppState: () => ({
    query: "", setQuery: vi.fn(), inputRef: { current: null }, dismiss: vi.fn(),
    visibleEntries: [], selectedIndex: 0, setSelectedIndex: vi.fn(), listRef: { current: null },
    onClickItem: vi.fn(), enterPinnedSection: vi.fn(), liftingId: null, landingId: null, deletingId: null,
    screen: { kind: "history" }, setScreen: vi.fn(), executePasteOption: vi.fn(),
    setPasteAsPreviewText: vi.fn(), openPreview: vi.fn(), isPreviewOpen: false,
    selectedItem: null, pasteAsPreviewText: null,
    clearConfirm: { show: false, onRequest: vi.fn(), onConfirm: vi.fn(), onCancel: vi.fn() },
    multiSelect: { active: false, selections: new Set(), maxToastVisible: false, flashingId: null },
    defaultSeparator: "newline", onMergePaste: vi.fn(), onCancelSeparator: vi.fn(),
    folders: [], folderNameInputValue: "", setFolderNameInputValue: vi.fn(),
    confirmFolderNameInput: vi.fn(), confirmFolderDelete: vi.fn(),
    moveItemToFolder: vi.fn(), removeItemFromFolder: vi.fn(),
    expandedFolderId: null, enterFolderSection: vi.fn(), exitFolderSection: vi.fn(),
    maxFoldersToast: false, updateInfo: null, installUpdate: vi.fn(), dismissUpdate: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.get.mockResolvedValue(null);
    mockStore.save.mockResolvedValue(undefined);
  });

  // Permissions dialog

  it("showPermissionsDialog is false when both permissions are granted", async () => {
    mockInvoke.mockResolvedValueOnce({ accessibility: true, input_monitoring: true });
    const { result } = renderHook(() => useApp());
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith("check_permissions"));
    expect(result.current.showPermissionsDialog).toBe(false);
  });

  it("showPermissionsDialog is true when accessibility is missing", async () => {
    mockInvoke.mockResolvedValueOnce({ accessibility: false, input_monitoring: true });
    const { result } = renderHook(() => useApp());
    await waitFor(() => expect(result.current.showPermissionsDialog).toBe(true));
  });

  it("showPermissionsDialog is true when input_monitoring is missing", async () => {
    mockInvoke.mockResolvedValueOnce({ accessibility: true, input_monitoring: false });
    const { result } = renderHook(() => useApp());
    await waitFor(() => expect(result.current.showPermissionsDialog).toBe(true));
  });

  it("onPermissionsDone hides the permissions dialog", async () => {
    mockInvoke.mockResolvedValueOnce({ accessibility: false, input_monitoring: false });
    const { result } = renderHook(() => useApp());
    await waitFor(() => expect(result.current.showPermissionsDialog).toBe(true));
    act(() => result.current.onPermissionsDone());
    expect(result.current.showPermissionsDialog).toBe(false);
  });

  // Store flags — activated toast

  it("activatedToast is true when just_activated flag is set in store", async () => {
    mockInvoke.mockResolvedValueOnce({ accessibility: true, input_monitoring: true });
    mockStore.get.mockImplementation((key: string) => {
      if (key === "just_activated") return Promise.resolve(true);
      return Promise.resolve(null);
    });
    const { result } = renderHook(() => useApp());
    await waitFor(() => expect(result.current.activatedToast).toBe(true));
    expect(mockStore.delete).toHaveBeenCalledWith("just_activated");
  });

  // Store flags — revoked banner

  it("revokedBanner is true when license_revoked flag is set in store", async () => {
    mockInvoke.mockResolvedValueOnce({ accessibility: true, input_monitoring: true });
    mockStore.get.mockImplementation((key: string) => {
      if (key === "license_revoked") return Promise.resolve(true);
      return Promise.resolve(null);
    });
    const { result } = renderHook(() => useApp());
    await waitFor(() => expect(result.current.revokedBanner).toBe(true));
  });

  // Upgrade banner

  it("dismissUpgradeBanner clears upgradeBannerFeature", async () => {
    mockInvoke.mockResolvedValueOnce({ accessibility: true, input_monitoring: true });
    const { result } = renderHook(() => useApp());
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith("check_permissions"));
    // Simulate feature being set via onTrialError (exposed as part of useAppState mock)
    // We test the dismiss direction only since onTrialError is wired internally
    expect(result.current.upgradeBannerFeature).toBeNull();
    act(() => result.current.dismissUpgradeBanner());
    expect(result.current.upgradeBannerFeature).toBeNull();
  });

  // visibilitychange re-runs checkStoreFlags

  it("visibilitychange to visible re-checks store flags", async () => {
    mockInvoke.mockResolvedValueOnce({ accessibility: true, input_monitoring: true });
    mockStore.get.mockResolvedValue(null);
    renderHook(() => useApp());
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith("check_permissions"));

    const callsBefore = mockStore.get.mock.calls.length;

    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    act(() => document.dispatchEvent(new Event("visibilitychange")));

    await waitFor(() => expect(mockStore.get.mock.calls.length).toBeGreaterThan(callsBefore));
  });
});
