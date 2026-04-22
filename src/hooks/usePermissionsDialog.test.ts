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

  it("calls onDone immediately when both permissions are granted", async () => {
    mockInvoke.mockResolvedValueOnce({ accessibility: true, input_monitoring: true });
    const onDone = vi.fn();
    renderHook(() => usePermissionsDialog(onDone));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
  });

  it("does not set completed key when permissions were already granted without dialog", async () => {
    mockInvoke.mockResolvedValueOnce({ accessibility: true, input_monitoring: true });
    const onDone = vi.fn();
    renderHook(() => usePermissionsDialog(onDone));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(localStorage.getItem(COMPLETED_KEY)).toBeNull();
  });

  it("calls onDone without dialog when completed key is set even if check reports permissions missing", async () => {
    localStorage.setItem(COMPLETED_KEY, "1");
    mockInvoke.mockResolvedValueOnce({ accessibility: false, input_monitoring: false });
    const onDone = vi.fn();
    renderHook(() => usePermissionsDialog(onDone));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(mockInvoke).toHaveBeenCalledWith("check_permissions");
  });

  it("returns dialogState === intro when no localStorage key and permissions missing", async () => {
    mockInvoke.mockResolvedValueOnce({ accessibility: false, input_monitoring: false });
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("intro"));
  });

  it("returns dialogState === accessibility when intro shown and accessibility missing", async () => {
    localStorage.setItem(INTRO_SHOWN_KEY, "1");
    mockInvoke.mockResolvedValueOnce({ accessibility: false, input_monitoring: false });
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
  });

  it("returns dialogState === input_monitoring when intro shown and only input_monitoring missing", async () => {
    localStorage.setItem(INTRO_SHOWN_KEY, "1");
    mockInvoke.mockResolvedValueOnce({ accessibility: true, input_monitoring: false });
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("input_monitoring"));
  });

  it("handleGetStarted sets intro key and transitions to accessibility", async () => {
    mockInvoke
      .mockResolvedValueOnce({ accessibility: false, input_monitoring: false })
      .mockResolvedValueOnce({ accessibility: false, input_monitoring: false });
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("intro"));
    act(() => result.current.handleGetStarted());
    expect(localStorage.getItem(INTRO_SHOWN_KEY)).toBe("1");
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
  });

  it("handleGetStarted transitions to input_monitoring when accessibility already granted", async () => {
    mockInvoke
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false })
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false });
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("intro"));
    act(() => result.current.handleGetStarted());
    await waitFor(() => expect(result.current.dialogState).toBe("input_monitoring"));
  });

  it("sets completed key in localStorage when transitioning to done", async () => {
    localStorage.setItem(INTRO_SHOWN_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: false, input_monitoring: false })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: true });
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
    act(() => result.current.handleIveAddedIt());
    await waitFor(() => expect(result.current.dialogState).toBe("input_monitoring"));
    act(() => result.current.handleInputMonitoringDone());
    await waitFor(() => expect(localStorage.getItem(COMPLETED_KEY)).toBe("1"));
  });

  it("handleIveAddedIt triggers input monitoring request and transitions to input_monitoring", async () => {
    localStorage.setItem(INTRO_SHOWN_KEY, "1");
    mockInvoke.mockResolvedValueOnce({ accessibility: false, input_monitoring: false });
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
    act(() => result.current.handleIveAddedIt());
    await waitFor(() => expect(result.current.dialogState).toBe("input_monitoring"));
    expect(mockInvoke).toHaveBeenCalledWith("request_input_monitoring_permission");
  });

  it("handleInputMonitoringDone sets completed key and calls onDone", async () => {
    localStorage.setItem(INTRO_SHOWN_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: false, input_monitoring: false })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: true });
    const onDone = vi.fn();
    const { result } = renderHook(() => usePermissionsDialog(onDone));
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
    act(() => result.current.handleIveAddedIt());
    await waitFor(() => expect(result.current.dialogState).toBe("input_monitoring"));
    act(() => result.current.handleInputMonitoringDone());
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(localStorage.getItem(COMPLETED_KEY)).toBe("1");
  });

  it("handleInputMonitoringDone transitions to denied when input_monitoring not yet granted", async () => {
    localStorage.setItem(INTRO_SHOWN_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: false, input_monitoring: false })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false });
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
    act(() => result.current.handleIveAddedIt());
    await waitFor(() => expect(result.current.dialogState).toBe("input_monitoring"));
    act(() => result.current.handleInputMonitoringDone());
    await waitFor(() => expect(result.current.dialogState).toBe("denied"));
  });

  it("handleOpenSystemSettings calls invoke open_privacy_settings", async () => {
    localStorage.setItem(INTRO_SHOWN_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: false, input_monitoring: false })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false });
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
    act(() => result.current.handleIveAddedIt());
    await waitFor(() => expect(result.current.dialogState).toBe("input_monitoring"));
    act(() => result.current.handleInputMonitoringDone());
    await waitFor(() => expect(result.current.dialogState).toBe("denied"));
    await act(async () => result.current.handleOpenSystemSettings());
    expect(mockInvoke).toHaveBeenCalledWith("open_privacy_settings");
  });

  it("handleCheckAgain transitions to done and calls onDone when both permissions granted", async () => {
    localStorage.setItem(INTRO_SHOWN_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: false, input_monitoring: false })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false })
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: true });
    const onDone = vi.fn();
    const { result } = renderHook(() => usePermissionsDialog(onDone));
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
    act(() => result.current.handleIveAddedIt());
    await waitFor(() => expect(result.current.dialogState).toBe("input_monitoring"));
    act(() => result.current.handleInputMonitoringDone());
    await waitFor(() => expect(result.current.dialogState).toBe("denied"));
    await act(async () => result.current.handleCheckAgain());
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
  });

  it("handleCheckAgain stays on denied when permissions still missing", async () => {
    localStorage.setItem(INTRO_SHOWN_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: false, input_monitoring: false })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false })
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false });
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
    act(() => result.current.handleIveAddedIt());
    await waitFor(() => expect(result.current.dialogState).toBe("input_monitoring"));
    act(() => result.current.handleInputMonitoringDone());
    await waitFor(() => expect(result.current.dialogState).toBe("denied"));
    await act(async () => result.current.handleCheckAgain());
    expect(result.current.dialogState).toBe("denied");
  });

  it("handleCheckAgain transitions to error when check_permissions fails", async () => {
    localStorage.setItem(INTRO_SHOWN_KEY, "1");
    mockInvoke
      .mockResolvedValueOnce({ accessibility: false, input_monitoring: false })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ accessibility: true, input_monitoring: false })
      .mockRejectedValueOnce(new Error("IPC error"));
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("accessibility"));
    act(() => result.current.handleIveAddedIt());
    await waitFor(() => expect(result.current.dialogState).toBe("input_monitoring"));
    act(() => result.current.handleInputMonitoringDone());
    await waitFor(() => expect(result.current.dialogState).toBe("denied"));
    await act(async () => result.current.handleCheckAgain());
    await waitFor(() => expect(result.current.dialogState).toBe("error"));
  });

  it("check_permissions failing on startup transitions to error", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("IPC error"));
    const { result } = renderHook(() => usePermissionsDialog(vi.fn()));
    await waitFor(() => expect(result.current.dialogState).toBe("error"));
  });
});
