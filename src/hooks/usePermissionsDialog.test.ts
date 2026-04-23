import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePermissionsDialog } from "@/hooks/usePermissionsDialog";

const mockInvoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

const INTRO_SHOWN_KEY = "kurippa.permissions.intro.shown";
const COMPLETED_KEY = "kurippa.permissions.completed";

describe("usePermissionsDialog", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(undefined);
  });

  // ---------------------------------------------------------------------------
  // Startup routing
  // ---------------------------------------------------------------------------

  it("calls onDone immediately when accessibility is granted", async () => {
    mockInvoke.mockResolvedValueOnce({ accessibility: true });
    const onDone = vi.fn();
    renderHook(() => usePermissionsDialog(onDone));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
  });

  it("does not set completed key when permissions were already granted without dialog", async () => {
    mockInvoke.mockResolvedValueOnce({ accessibility: true });
    const onDone = vi.fn();
    renderHook(() => usePermissionsDialog(onDone));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(localStorage.getItem(COMPLETED_KEY)).toBeNull();
  });

  it("calls onDone without dialog when completed key is set even if check reports permissions missing", async () => {
    localStorage.setItem(COMPLETED_KEY, "1");
    mockInvoke.mockResolvedValueOnce({ accessibility: false });
    const onDone = vi.fn();
    renderHook(() => usePermissionsDialog(onDone));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(mockInvoke).toHaveBeenCalledWith("check_permissions");
  });

  it("returns dialogState === intro when no localStorage key and accessibility missing", async () => {
    mockInvoke.mockResolvedValueOnce({ accessibility: false });
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("intro"));
  });

  it("returns dialogState === accessibility when intro shown and accessibility missing", async () => {
    localStorage.setItem(INTRO_SHOWN_KEY, "1");
    mockInvoke.mockResolvedValueOnce({ accessibility: false });
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
  });

  it("startup routes to done when accessibility is already granted", async () => {
    mockInvoke.mockResolvedValueOnce({ accessibility: true });
    const onDone = vi.fn();
    renderHook(() => usePermissionsDialog(onDone));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
  });

  // ---------------------------------------------------------------------------
  // handleGetStarted
  // ---------------------------------------------------------------------------

  it("handleGetStarted sets intro key and transitions to accessibility when not yet granted", async () => {
    mockInvoke
      .mockResolvedValueOnce({ accessibility: false })
      .mockResolvedValueOnce({ accessibility: false });
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("intro"));
    act(() => result.current.handleGetStarted());
    expect(localStorage.getItem(INTRO_SHOWN_KEY)).toBe("1");
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
  });

  it("handleGetStarted skips to done when accessibility already granted", async () => {
    mockInvoke
      .mockResolvedValueOnce({ accessibility: false })
      .mockResolvedValueOnce({ accessibility: true });
    const onDone = vi.fn();
    const { result } = renderHook(() => usePermissionsDialog(onDone));
    await waitFor(() => expect(result.current.dialogState).toBe("intro"));
    act(() => result.current.handleGetStarted());
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
  });

  // ---------------------------------------------------------------------------
  // handleIveAddedIt (accessibility confirmation → done or denied)
  // ---------------------------------------------------------------------------

  it("handleIveAddedIt goes to done and calls onDone when accessibility is now granted", async () => {
    localStorage.setItem(INTRO_SHOWN_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: false })
      .mockResolvedValueOnce(undefined) // request_accessibility_permission
      .mockResolvedValueOnce({ accessibility: true });
    const onDone = vi.fn();
    const { result } = renderHook(() => usePermissionsDialog(onDone));
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
    act(() => result.current.handleIveAddedIt());
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(localStorage.getItem(COMPLETED_KEY)).toBe("1");
  });

  it("handleIveAddedIt transitions to denied when accessibility not yet granted", async () => {
    localStorage.setItem(INTRO_SHOWN_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: false })
      .mockResolvedValueOnce(undefined) // request_accessibility_permission
      .mockResolvedValueOnce({ accessibility: false });
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
    act(() => result.current.handleIveAddedIt());
    await waitFor(() => expect(result.current.dialogState).toBe("denied"));
  });

  // ---------------------------------------------------------------------------
  // handleCheckAgain
  // ---------------------------------------------------------------------------

  it("handleCheckAgain transitions to done and calls onDone when accessibility granted", async () => {
    localStorage.setItem(INTRO_SHOWN_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: false })
      .mockResolvedValueOnce(undefined) // request_accessibility_permission
      .mockResolvedValueOnce({ accessibility: false }) // handleIveAddedIt → denied
      .mockResolvedValueOnce({ accessibility: true }); // handleCheckAgain
    const onDone = vi.fn();
    const { result } = renderHook(() => usePermissionsDialog(onDone));
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
    act(() => result.current.handleIveAddedIt());
    await waitFor(() => expect(result.current.dialogState).toBe("denied"));
    await act(async () => result.current.handleCheckAgain());
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
  });

  it("handleCheckAgain stays on denied when accessibility still missing", async () => {
    localStorage.setItem(INTRO_SHOWN_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: false })
      .mockResolvedValueOnce(undefined) // request_accessibility_permission
      .mockResolvedValueOnce({ accessibility: false }) // handleIveAddedIt → denied
      .mockResolvedValueOnce({ accessibility: false }); // handleCheckAgain
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
    act(() => result.current.handleIveAddedIt());
    await waitFor(() => expect(result.current.dialogState).toBe("denied"));
    await act(async () => result.current.handleCheckAgain());
    expect(result.current.dialogState).toBe("denied");
  });

  it("handleCheckAgain transitions to error when check_permissions fails", async () => {
    localStorage.setItem(INTRO_SHOWN_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: false })
      .mockResolvedValueOnce(undefined) // request_accessibility_permission
      .mockResolvedValueOnce({ accessibility: false }) // handleIveAddedIt → denied
      .mockRejectedValueOnce(new Error("IPC error")); // handleCheckAgain
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
    act(() => result.current.handleIveAddedIt());
    await waitFor(() => expect(result.current.dialogState).toBe("denied"));
    await act(async () => result.current.handleCheckAgain());
    await waitFor(() => expect(result.current.dialogState).toBe("error"));
  });

  // ---------------------------------------------------------------------------
  // handleOpenSystemSettings
  // ---------------------------------------------------------------------------

  it("handleOpenSystemSettings calls invoke open_privacy_settings", async () => {
    localStorage.setItem(INTRO_SHOWN_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: false })
      .mockResolvedValueOnce(undefined) // request_accessibility_permission
      .mockResolvedValueOnce({ accessibility: false }); // handleIveAddedIt → denied
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
    act(() => result.current.handleIveAddedIt());
    await waitFor(() => expect(result.current.dialogState).toBe("denied"));
    await act(async () => result.current.handleOpenSystemSettings());
    expect(mockInvoke).toHaveBeenCalledWith("open_privacy_settings");
  });

  // ---------------------------------------------------------------------------
  // localStorage: COMPLETED_KEY
  // ---------------------------------------------------------------------------

  it("sets completed key in localStorage when transitioning to done via handleIveAddedIt", async () => {
    localStorage.setItem(INTRO_SHOWN_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: false })
      .mockResolvedValueOnce(undefined) // request_accessibility_permission
      .mockResolvedValueOnce({ accessibility: true });
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
    act(() => result.current.handleIveAddedIt());
    await waitFor(() => expect(localStorage.getItem(COMPLETED_KEY)).toBe("1"));
  });

  // ---------------------------------------------------------------------------
  // Error on startup
  // ---------------------------------------------------------------------------

  it("check_permissions failing on startup transitions to error", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("IPC error"));
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("error"));
  });
});
