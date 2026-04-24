import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { Provider, createStore } from "jotai";
import { StoreProvider } from "@/store/index";
import {
  useClipboardStore,
  useFoldersStore,
  useNavigationStore,
  useMultiSelectStore,
  useUIStore,
  useSettingsStore,
} from "@/store/index";

// Tauri and plugin stubs required because ClipboardStoreProvider reads atoms
// that are populated by hooks wired to Tauri — we only need the providers to
// mount without crashing here; atom default values are sufficient.

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn().mockResolvedValue([]) }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn().mockResolvedValue(vi.fn()) }));
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
  getCurrentWebviewWindow: () => ({ setSize: vi.fn().mockResolvedValue(undefined) }),
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

function makeWrapper() {
  const store = createStore();
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(Provider, { store }, createElement(StoreProvider, null, children));
  return wrapper;
}

describe("StoreProvider — composed provider tree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mounts without error and exposes clipboard defaults", () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useClipboardStore(), { wrapper });
    expect(result.current.allItems).toEqual([]);
    expect(result.current.results).toEqual([]);
    expect(result.current.visibleEntries).toEqual([]);
    expect(result.current.liftingId).toBeNull();
    expect(result.current.landingId).toBeNull();
    expect(result.current.deletingId).toBeNull();
  });

  it("exposes folders defaults", () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useFoldersStore(), { wrapper });
    expect(result.current.folders).toEqual([]);
    expect(result.current.maxFoldersToast).toBe(false);
    expect(result.current.folderNameInputValue).toBe("");
  });

  it("exposes navigation defaults", () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useNavigationStore(), { wrapper });
    expect(result.current.query).toBe("");
    expect(result.current.selectedIndex).toBe(0);
    expect(result.current.expandedSection).toBeNull();
    expect(result.current.inPinnedSection).toBe(false);
    expect(result.current.expandedFolderId).toBeNull();
  });

  it("exposes multiSelect defaults", () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useMultiSelectStore(), { wrapper });
    expect(result.current.active).toBe(false);
    expect(result.current.selections).toEqual([]);
    expect(result.current.flashingId).toBeNull();
    expect(result.current.maxToastVisible).toBe(false);
  });

  it("exposes UI defaults", () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useUIStore(), { wrapper });
    expect(result.current.previewPanelOpen).toBe(false);
    expect(result.current.pasteAsPreviewText).toBeNull();
    expect(result.current.clearConfirmShow).toBe(false);
    expect(result.current.updateInfo).toBeNull();
  });

  it("exposes settings defaults", () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useSettingsStore(), { wrapper });
    expect(result.current.defaultSeparator).toBe("newline");
  });
});
