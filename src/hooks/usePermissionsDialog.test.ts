import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePermissionsDialog } from "@/hooks/usePermissionsDialog";

const mockInvoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

const STORAGE_KEY = "kurippa.permissions.intro.shown";

describe("usePermissionsDialog", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("calls onDone immediately when both permissions are granted", async () => {
    mockInvoke.mockResolvedValue({ accessibility: true, input_monitoring: true });
    const onDone = vi.fn();
    renderHook(() => usePermissionsDialog(onDone));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
  });

  it("returns dialogState === intro when no localStorage key and permissions missing", async () => {
    mockInvoke.mockResolvedValue({ accessibility: false, input_monitoring: false });
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("intro"));
  });

  it("returns dialogState === accessibility when localStorage key present and accessibility missing", async () => {
    localStorage.setItem(STORAGE_KEY, "1");
    mockInvoke.mockResolvedValue({ accessibility: false, input_monitoring: false });
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
  });

  it("handleGetStarted sets localStorage key and transitions to accessibility when not granted", async () => {
    mockInvoke
      .mockResolvedValueOnce({ accessibility: false, input_monitoring: false })
      .mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("intro"));
    act(() => result.current.handleGetStarted());
    expect(localStorage.getItem(STORAGE_KEY)).toBe("1");
    expect(result.current.dialogState).toBe("accessibility");
  });

  it("handleGetStarted transitions to input_monitoring when accessibility already granted", async () => {
    localStorage.setItem(STORAGE_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false })
      .mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("input_monitoring"));
    act(() => result.current.handleGetStarted());
    expect(result.current.dialogState).toBe("input_monitoring");
  });

  it("handleIveAddedIt transitions to input_monitoring", async () => {
    localStorage.setItem(STORAGE_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: false, input_monitoring: false })
      .mockResolvedValueOnce(undefined)
      .mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
    act(() => result.current.handleIveAddedIt());
    expect(result.current.dialogState).toBe("input_monitoring");
  });

  it("handleOpenSystemSettings calls invoke open_privacy_settings", async () => {
    localStorage.setItem(STORAGE_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false })
      .mockResolvedValueOnce(false);
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("denied"));
    mockInvoke.mockResolvedValueOnce(undefined);
    await act(async () => result.current.handleOpenSystemSettings());
    expect(mockInvoke).toHaveBeenCalledWith("open_privacy_settings");
  });

  it("handleCheckAgain transitions to done and calls onDone when both permissions granted", async () => {
    localStorage.setItem(STORAGE_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false })
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: true });
    const onDone = vi.fn();
    const { result } = renderHook(() => usePermissionsDialog(onDone));
    await waitFor(() => expect(result.current.dialogState).toBe("denied"));
    await act(async () => result.current.handleCheckAgain());
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
  });

  it("handleCheckAgain stays on denied when permissions still missing", async () => {
    localStorage.setItem(STORAGE_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false })
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false });
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("denied"));
    await act(async () => result.current.handleCheckAgain());
    expect(result.current.dialogState).toBe("denied");
  });

  it("request_input_monitoring_permission returning true transitions to done and calls onDone", async () => {
    localStorage.setItem(STORAGE_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false })
      .mockResolvedValueOnce(true);
    const onDone = vi.fn();
    renderHook(() => usePermissionsDialog(onDone));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
  });

  it("request_input_monitoring_permission returning false transitions to denied", async () => {
    localStorage.setItem(STORAGE_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false })
      .mockResolvedValueOnce(false);
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("denied"));
  });

  it("check_permissions failing transitions to error", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("IPC error"));
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("error"));
  });
});
