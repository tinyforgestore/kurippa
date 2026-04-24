import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { createStore, Provider } from "jotai";
import { useAppKeyboard } from "@/hooks/useAppKeyboard";
import { ListEntry } from "@/types";

function makeWrapper() {
  const store = createStore();
  return { wrapper: ({ children }: { children: React.ReactNode }) => createElement(Provider, { store }, children) };
}

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

const mockNav = {
  toHistory: vi.fn(),
  toPasteAs: vi.fn(),
  toSeparatorPicker: vi.fn(),
  toFolderNameInput: vi.fn(),
  toFolderDelete: vi.fn(),
  toFolderPicker: vi.fn(),
};
vi.mock("@/hooks/useAppNavigation", () => ({ useAppNavigation: () => mockNav }));

let mockPathname = "/";
let mockState: unknown = null;
vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: mockPathname, state: mockState }),
  useNavigate: () => vi.fn(),
}));

function fireKey(key: string, modifiers: Partial<KeyboardEventInit> = {}) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...modifiers }));
  });
}

function makeMultiSelect(overrides = {}) {
  return {
    active: false,
    selections: [] as number[],
    enterMode: vi.fn(),
    exitMode: vi.fn(),
    toggleSelection: vi.fn(),
    ...overrides,
  };
}

function makeItemEntry(id: number): ListEntry {
  return {
    kind: "item",
    result: {
      item: { id, kind: "text", text: "hello", html: null, rtf: null, image_path: null, source_app: null, created_at: 0, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null },
      highlighted: null, score: 1, folder_name: null,
    },
  };
}

function makeFolderHeaderEntry(folderId: number, name: string): ListEntry {
  return { kind: "folder-header", folderId, name, count: 1, expanded: false };
}

function makeConfig(overrides: Partial<Parameters<typeof useAppKeyboard>[0]> = {}) {
  return {
    multiSelect: makeMultiSelect(),
    visibleEntries: [] as ListEntry[],
    selectedIndexRef: { current: 0 },
    inputActive: false,
    expandedFolderId: null,
    exitFolderSection: vi.fn(),
    setFolderNameInputValue: vi.fn(),
    dismiss: vi.fn(),
    isActivated: true,
    ...overrides,
  };
}

describe("useAppKeyboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(undefined);
    mockPathname = "/";
    mockState = null;
  });

  it("Cmd+, opens settings window", () => {
    renderHook(() => useAppKeyboard(makeConfig()), makeWrapper());
    fireKey(",", { metaKey: true });
    expect(mockInvoke).toHaveBeenCalledWith("open_settings_window");
  });

  it("Cmd+N opens folder name input when not inputActive and not multiselect", () => {
    const setFolderNameInputValue = vi.fn();
    renderHook(() => useAppKeyboard(makeConfig({ setFolderNameInputValue })), makeWrapper());
    fireKey("n", { metaKey: true });
    expect(setFolderNameInputValue).toHaveBeenCalledWith("");
    expect(mockNav.toFolderNameInput).toHaveBeenCalledWith("create", null, null);
  });

  it("Cmd+N is ignored when inputActive", () => {
    renderHook(() => useAppKeyboard(makeConfig({ inputActive: true })), makeWrapper());
    fireKey("n", { metaKey: true });
    expect(mockNav.toFolderNameInput).not.toHaveBeenCalled();
  });

  it("Cmd+N is ignored when multiselect is active", () => {
    renderHook(() => useAppKeyboard(makeConfig({ multiSelect: makeMultiSelect({ active: true }) })), makeWrapper());
    fireKey("n", { metaKey: true });
    expect(mockNav.toFolderNameInput).not.toHaveBeenCalled();
  });

  it("F2 on folder-header opens rename input", () => {
    const setFolderNameInputValue = vi.fn();
    const entry = makeFolderHeaderEntry(5, "Work");
    renderHook(() => useAppKeyboard(makeConfig({
      setFolderNameInputValue,
      visibleEntries: [entry],
      selectedIndexRef: { current: 0 },
    })), makeWrapper());
    fireKey("F2");
    expect(setFolderNameInputValue).toHaveBeenCalledWith("Work");
    expect(mockNav.toFolderNameInput).toHaveBeenCalledWith("rename", 5, null);
  });

  it("F2 on non-folder-header does nothing", () => {
    renderHook(() => useAppKeyboard(makeConfig({
      visibleEntries: [makeItemEntry(1)],
      selectedIndexRef: { current: 0 },
    })), makeWrapper());
    fireKey("F2");
    expect(mockNav.toFolderNameInput).not.toHaveBeenCalled();
  });

  it("Cmd+Shift+F on item opens folder picker", () => {
    renderHook(() => useAppKeyboard(makeConfig({
      visibleEntries: [makeItemEntry(7)],
      selectedIndexRef: { current: 0 },
    })), makeWrapper());
    fireKey("f", { metaKey: true, shiftKey: true });
    expect(mockNav.toFolderPicker).toHaveBeenCalledWith(7);
  });

  it("Escape exits expanded folder section", () => {
    const exitFolderSection = vi.fn();
    renderHook(() => useAppKeyboard(makeConfig({ expandedFolderId: 3, exitFolderSection })), makeWrapper());
    fireKey("Escape");
    expect(exitFolderSection).toHaveBeenCalledOnce();
  });

  it("Escape on folder-delete pathname navigates to history", () => {
    mockPathname = "/folder-delete";
    renderHook(() => useAppKeyboard(makeConfig()), makeWrapper());
    fireKey("Escape");
    expect(mockNav.toHistory).toHaveBeenCalledOnce();
  });

  it("Cmd+M enters multiselect when item is selected", () => {
    const multiSelect = makeMultiSelect({ active: false });
    renderHook(() => useAppKeyboard(makeConfig({
      multiSelect,
      visibleEntries: [makeItemEntry(4)],
      selectedIndexRef: { current: 0 },
    })), makeWrapper());
    fireKey("m", { metaKey: true });
    expect(multiSelect.enterMode).toHaveBeenCalledWith(4);
  });

  it("Cmd+M exits multiselect when already active", () => {
    const multiSelect = makeMultiSelect({ active: true });
    renderHook(() => useAppKeyboard(makeConfig({ multiSelect })), makeWrapper());
    fireKey("m", { metaKey: true });
    expect(multiSelect.exitMode).toHaveBeenCalledOnce();
    expect(mockNav.toHistory).toHaveBeenCalledOnce();
  });

  it("Space toggles selection in multiselect mode", () => {
    const multiSelect = makeMultiSelect({ active: true, selections: [] });
    renderHook(() => useAppKeyboard(makeConfig({
      multiSelect,
      visibleEntries: [makeItemEntry(2)],
      selectedIndexRef: { current: 0 },
    })), makeWrapper());
    fireKey(" ");
    expect(multiSelect.toggleSelection).toHaveBeenCalledWith(2, true);
  });

  it("Enter in multiselect with 1 selection pastes and dismisses", () => {
    const dismiss = vi.fn();
    const multiSelect = makeMultiSelect({ active: true, selections: [3] });
    renderHook(() => useAppKeyboard(makeConfig({
      multiSelect,
      dismiss,
      visibleEntries: [makeItemEntry(3)],
      selectedIndexRef: { current: 0 },
    })), makeWrapper());
    fireKey("Enter");
    expect(mockInvoke).toHaveBeenCalledWith("paste_item", expect.objectContaining({ itemId: 3 }));
    expect(multiSelect.exitMode).toHaveBeenCalledOnce();
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it("Enter in multiselect with 2+ selections opens separator picker", () => {
    const multiSelect = makeMultiSelect({ active: true, selections: [1, 2] });
    renderHook(() => useAppKeyboard(makeConfig({ multiSelect })), makeWrapper());
    fireKey("Enter");
    expect(mockNav.toSeparatorPicker).toHaveBeenCalledOnce();
  });

  it("Escape in multiselect exits multiselect", () => {
    const multiSelect = makeMultiSelect({ active: true });
    renderHook(() => useAppKeyboard(makeConfig({ multiSelect })), makeWrapper());
    fireKey("Escape");
    expect(multiSelect.exitMode).toHaveBeenCalledOnce();
  });

  it("Cmd+N calls onTrialError when not activated", () => {
    const onTrialError = vi.fn();
    renderHook(() => useAppKeyboard(makeConfig({ isActivated: false, onTrialError })), makeWrapper());
    fireKey("n", { metaKey: true });
    expect(onTrialError).toHaveBeenCalledWith("Folder organisation");
    expect(mockNav.toFolderNameInput).not.toHaveBeenCalled();
  });

  it("Cmd+Shift+F calls onTrialError when not activated", () => {
    const onTrialError = vi.fn();
    renderHook(() => useAppKeyboard(makeConfig({
      isActivated: false,
      onTrialError,
      visibleEntries: [makeItemEntry(1)],
      selectedIndexRef: { current: 0 },
    })), makeWrapper());
    fireKey("f", { metaKey: true, shiftKey: true });
    expect(onTrialError).toHaveBeenCalledWith("Folder organisation");
    expect(mockNav.toFolderPicker).not.toHaveBeenCalled();
  });

  it("Cmd+M calls onTrialError when not activated and not in multiselect", () => {
    const onTrialError = vi.fn();
    renderHook(() => useAppKeyboard(makeConfig({
      isActivated: false,
      onTrialError,
      visibleEntries: [makeItemEntry(1)],
      selectedIndexRef: { current: 0 },
    })), makeWrapper());
    fireKey("m", { metaKey: true });
    expect(onTrialError).toHaveBeenCalledWith("Multi-paste");
  });

  it("Space in multiselect does nothing when no entry at index", () => {
    const multiSelect = makeMultiSelect({ active: true });
    renderHook(() => useAppKeyboard(makeConfig({
      multiSelect,
      visibleEntries: [],
      selectedIndexRef: { current: 0 },
    })), makeWrapper());
    fireKey(" ");
    expect(multiSelect.toggleSelection).not.toHaveBeenCalled();
  });

  it("Enter in multiselect with 1 selection does nothing when item not in visible list", () => {
    const dismiss = vi.fn();
    const multiSelect = makeMultiSelect({ active: true, selections: [99] });
    renderHook(() => useAppKeyboard(makeConfig({
      multiSelect,
      dismiss,
      visibleEntries: [makeItemEntry(1)],
      selectedIndexRef: { current: 0 },
    })), makeWrapper());
    fireKey("Enter");
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
  });
});
