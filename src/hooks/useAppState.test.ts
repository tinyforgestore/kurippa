import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { Provider, createStore } from "jotai";
import { StoreProvider } from "@/store";
import { useAppState } from "@/hooks/useAppState";
import { allItemsAtom } from "@/atoms/clipboard";
import { selectedIndexAtom, expandedSectionAtom, queryAtom } from "@/atoms/navigation";
import { foldersAtom } from "@/atoms/folders";
import { getPasteOptions } from "@/utils/pasteAs";
import { ClipboardItem } from "@/types";
import { UPDATE_AVAILABLE } from "@/constants/events";
import { flushEffects } from "@/test-utils/flushEffects";

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
    if (event === UPDATE_AVAILABLE) capturedUpdateListener = cb;
    return Promise.resolve(mockUnlisten);
  });
}

function makeWrapper() {
  const store = createStore();
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(Provider, { store }, createElement(StoreProvider, null, createElement(MemoryRouter, null, children)));
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

  it("initial updateInfo is null", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAppState(), { wrapper });
    expect(result.current.updateInfo).toBeNull();
    await flushEffects();
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

  it("onCancelSeparator is a function", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAppState(), { wrapper });
    expect(typeof result.current.onCancelSeparator).toBe("function");
    await flushEffects();
  });
});

describe("useAppState — split into items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setupMocks();
  });

  const makeItem = (o: Partial<ClipboardItem>): ClipboardItem => ({
    id: 1, kind: "text", text: "x", html: null, rtf: null, image_path: null,
    source_app: null, created_at: 0, pinned: false, folder_id: null,
    qr_text: null, image_width: null, image_height: null, ...o,
  });

  const makeFolder = (id: number) => ({ id, name: `f${id}`, created_at: 0, position: id });

  function openSplit(source: ClipboardItem) {
    return getPasteOptions(source).find((o) => o.label === "Split into items")!.submenu![0];
  }

  async function setup(
    items: ClipboardItem[],
    opts: { folderIds?: number[]; expanded?: "pinned" | number | null; query?: string } = {},
  ) {
    const { store, wrapper } = makeWrapper();
    const { result } = renderHook(() => useAppState(), { wrapper });
    await flushEffects();
    act(() => {
      store.set(allItemsAtom, items);
      store.set(foldersAtom, (opts.folderIds ?? []).map(makeFolder));
      store.set(expandedSectionAtom, opts.expanded ?? null);
      store.set(queryAtom, opts.query ?? "");
    });
    // Selection is applied after the arrange step above, which may reset it via the query effect.
    act(() => store.set(selectedIndexAtom, 5));
    mockInvoke.mockClear();
    return { store, result };
  }

  function mockHistoryAfterInsert(rows: ClipboardItem[]) {
    mockInvoke.mockImplementation((cmd: string) =>
      Promise.resolve(cmd === "get_history" ? rows : undefined)
    );
  }

  function focusedText(result: { current: ReturnType<typeof useAppState> }) {
    const entry = result.current.visibleEntries[result.current.selectedIndex];
    return entry?.kind === "item" ? entry.result.item.text : undefined;
  }

  it("moves the cursor past the pinned entry to the first regular entry (original layout)", async () => {
    const source = makeItem({ id: 2, text: "a,b" });
    const { store, result } = await setup([makeItem({ id: 1, pinned: true }), source]);

    await act(async () => result.current.executePasteOption(openSplit(source)));

    expect(mockInvoke).toHaveBeenCalledWith("insert_text_items", { texts: ["a", "b"] });
    expect(mockInvoke).toHaveBeenCalledWith("get_history", expect.anything());
    expect(store.get(selectedIndexAtom)).toBe(1);
  });

  it("counts folder headers before the first regular entry", async () => {
    const source = makeItem({ id: 2, text: "a,b" });
    const { store, result } = await setup([makeItem({ id: 1, pinned: true }), source], { folderIds: [10, 11] });

    await act(async () => result.current.executePasteOption(openSplit(source)));

    expect(store.get(selectedIndexAtom)).toBe(3);
  });

  it("collapses an expanded pinned section and focuses the first piece", async () => {
    const source = makeItem({ id: 1, pinned: true, text: "a,b" });
    const other = makeItem({ id: 2, pinned: true, text: "other" });
    const { store, result } = await setup([source, other], { expanded: "pinned" });
    mockHistoryAfterInsert([
      source, other,
      makeItem({ id: 4, text: "a" }), makeItem({ id: 3, text: "b" }),
    ]);

    await act(async () => result.current.executePasteOption(openSplit(source)));
    await flushEffects();

    expect(store.get(expandedSectionAtom)).toBeNull();
    expect(store.get(selectedIndexAtom)).toBe(1);
    expect(focusedText(result)).toBe("a");
  });

  it("collapses an expanded folder section", async () => {
    const source = makeItem({ id: 1, folder_id: 10, text: "a,b" });
    const { store, result } = await setup([source], { folderIds: [10], expanded: 10 });

    await act(async () => result.current.executePasteOption(openSplit(source)));

    expect(store.get(expandedSectionAtom)).toBeNull();
    expect(store.get(selectedIndexAtom)).toBe(1);
  });

  it("works when the source is the only item and is pinned (no regular items)", async () => {
    const source = makeItem({ id: 1, pinned: true, text: "a,b" });
    const { store, result } = await setup([source]);

    await act(async () => result.current.executePasteOption(openSplit(source)));

    expect(store.get(selectedIndexAtom)).toBe(1);
  });

  it("works when the source is the only item and is in a folder", async () => {
    const source = makeItem({ id: 1, folder_id: 10, text: "a,b" });
    const { store, result } = await setup([source], { folderIds: [10] });

    await act(async () => result.current.executePasteOption(openSplit(source)));

    expect(store.get(selectedIndexAtom)).toBe(1);
  });

  it("clears an active search query and focuses the first piece", async () => {
    const source = makeItem({ id: 2, text: "a,b" });
    const pinned = makeItem({ id: 1, pinned: true, text: "a,pin" });
    const { store, result } = await setup([pinned, source], { query: "a" });
    mockHistoryAfterInsert([
      pinned, makeItem({ id: 4, text: "a" }), makeItem({ id: 3, text: "b" }), source,
    ]);

    await act(async () => result.current.executePasteOption(openSplit(source)));
    await flushEffects();

    expect(store.get(queryAtom)).toBe("");
    expect(store.get(selectedIndexAtom)).toBe(1);
    expect(focusedText(result)).toBe("a");
  });

  it("resets the cursor to 0 on the next query change after a split with an active query", async () => {
    const source = makeItem({ id: 2, text: "a,b" });
    const { store, result } = await setup([makeItem({ id: 1, pinned: true, text: "a,pin" }), source], { query: "a" });

    await act(async () => result.current.executePasteOption(openSplit(source)));
    await flushEffects();
    expect(store.get(selectedIndexAtom)).toBe(1);

    act(() => store.set(queryAtom, "b"));
    await flushEffects();

    expect(store.get(selectedIndexAtom)).toBe(0);
  });

  it("does not park a stale cursor when the query was already cleared while the insert was in flight", async () => {
    const source = makeItem({ id: 2, text: "a,b" });
    const { store, result } = await setup([makeItem({ id: 1, pinned: true, text: "a,pin" }), source], { query: "a" });
    const staleExecute = result.current.executePasteOption;
    const staleOption = openSplit(source);

    act(() => store.set(queryAtom, ""));
    await act(async () => staleExecute(staleOption));
    await flushEffects();
    expect(store.get(selectedIndexAtom)).toBe(1);

    act(() => store.set(queryAtom, "zz"));
    await flushEffects();

    expect(store.get(selectedIndexAtom)).toBe(0);
  });
});
