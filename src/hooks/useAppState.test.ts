import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { Provider, createStore } from "jotai";
import { useAppState } from "@/hooks/useAppState";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockInvoke = vi.fn();
const mockUnlisten = vi.fn();
const mockListen = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...a: unknown[]) => mockInvoke(...a),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...a: unknown[]) => mockListen(...a),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    hide: vi.fn().mockResolvedValue(undefined),
    onFocusChanged: vi.fn().mockResolvedValue(vi.fn()),
  }),
  LogicalSize: class {
    constructor(public width: number, public height: number) {}
  },
}));

vi.mock("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({
    setSize: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    delete: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let capturedUpdateListener: ((event: { payload: string }) => void) | null = null;

function setupMocks() {
  capturedUpdateListener = null;

  mockInvoke.mockImplementation((cmd: string) => {
    if (cmd === "get_history") return Promise.resolve([]);
    if (cmd === "get_folders") return Promise.resolve([]);
    if (cmd === "get_settings") return Promise.resolve({
      history_limit: "h100",
      auto_clear_after: "off",
      multi_paste_separator: "newline",
      launch_at_login: false,
    });
    return Promise.resolve(undefined);
  });

  mockListen.mockImplementation((event: string, cb: (e: { payload: string }) => void) => {
    if (event === "update-available") capturedUpdateListener = cb;
    return Promise.resolve(mockUnlisten);
  });
}

function makeWrapper() {
  const store = createStore();
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(Provider, { store }, createElement(MemoryRouter, null, children));
  return { store, wrapper };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useAppState — own logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setupMocks();
  });

  it("initial updateInfo is null", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAppState(), { wrapper });
    expect(result.current.updateInfo).toBeNull();
  });

  it("update-available event with new version sets updateInfo", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAppState(), { wrapper });
    await waitFor(() => expect(capturedUpdateListener).not.toBeNull());
    act(() => capturedUpdateListener!({ payload: "2.0.0" }));
    expect(result.current.updateInfo).toEqual({ version: "2.0.0" });
  });

  it("update-available event with dismissed version keeps updateInfo null", async () => {
    localStorage.setItem("dismissed_update_version", "1.5.0");
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAppState(), { wrapper });
    await waitFor(() => expect(capturedUpdateListener).not.toBeNull());
    act(() => capturedUpdateListener!({ payload: "1.5.0" }));
    expect(result.current.updateInfo).toBeNull();
  });

  it("dismissUpdate clears updateInfo and sets localStorage", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAppState(), { wrapper });
    await waitFor(() => expect(capturedUpdateListener).not.toBeNull());
    act(() => capturedUpdateListener!({ payload: "3.0.0" }));
    expect(result.current.updateInfo).toEqual({ version: "3.0.0" });
    act(() => result.current.dismissUpdate());
    expect(result.current.updateInfo).toBeNull();
    expect(localStorage.getItem("dismissed_update_version")).toBe("3.0.0");
  });

  it("installUpdate calls invoke('install_update')", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAppState(), { wrapper });
    act(() => result.current.installUpdate());
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith("install_update"));
  });

  it("onCancelSeparator is a function", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAppState(), { wrapper });
    expect(typeof result.current.onCancelSeparator).toBe("function");
  });
});
