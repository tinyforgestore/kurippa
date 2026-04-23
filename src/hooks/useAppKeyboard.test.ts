import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAppKeyboard } from "@/hooks/useAppKeyboard";
import { AppScreen } from "@/hooks/useAppState";
import { ListEntry } from "@/types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

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
    screen: { kind: "history" } as AppScreen,
    setScreen: vi.fn(),
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
  beforeEach(() => { vi.clearAllMocks(); mockInvoke.mockResolvedValue(undefined); });

  it("Cmd+, opens settings window", () => {
    renderHook(() => useAppKeyboard(makeConfig()));
    fireKey(",", { metaKey: true });
    expect(mockInvoke).toHaveBeenCalledWith("open_settings_window");
  });

  it("Cmd+N opens folder name input when not inputActive and not multiselect", () => {
    const setScreen = vi.fn();
    const setFolderNameInputValue = vi.fn();
    renderHook(() => useAppKeyboard(makeConfig({ setScreen, setFolderNameInputValue })));
    fireKey("n", { metaKey: true });
    expect(setFolderNameInputValue).toHaveBeenCalledWith("");
    expect(setScreen).toHaveBeenCalledWith({ kind: "folderNameInput", mode: "create", targetId: null, pickerItemId: null });
  });

  it("Cmd+N is ignored when inputActive", () => {
    const setScreen = vi.fn();
    renderHook(() => useAppKeyboard(makeConfig({ setScreen, inputActive: true })));
    fireKey("n", { metaKey: true });
    expect(setScreen).not.toHaveBeenCalled();
  });

  it("Cmd+N is ignored when multiselect is active", () => {
    const setScreen = vi.fn();
    renderHook(() => useAppKeyboard(makeConfig({ setScreen, multiSelect: makeMultiSelect({ active: true }) })));
    fireKey("n", { metaKey: true });
    expect(setScreen).not.toHaveBeenCalled();
  });

  it("F2 on folder-header opens rename input", () => {
    const setScreen = vi.fn();
    const setFolderNameInputValue = vi.fn();
    const entry = makeFolderHeaderEntry(5, "Work");
    renderHook(() => useAppKeyboard(makeConfig({
      setScreen,
      setFolderNameInputValue,
      visibleEntries: [entry],
      selectedIndexRef: { current: 0 },
    })));
    fireKey("F2");
    expect(setFolderNameInputValue).toHaveBeenCalledWith("Work");
    expect(setScreen).toHaveBeenCalledWith({ kind: "folderNameInput", mode: "rename", targetId: 5, pickerItemId: null });
  });

  it("F2 on non-folder-header does nothing", () => {
    const setScreen = vi.fn();
    renderHook(() => useAppKeyboard(makeConfig({
      setScreen,
      visibleEntries: [makeItemEntry(1)],
      selectedIndexRef: { current: 0 },
    })));
    fireKey("F2");
    expect(setScreen).not.toHaveBeenCalled();
  });

  it("Cmd+Shift+F on item opens folder picker", () => {
    const setScreen = vi.fn();
    renderHook(() => useAppKeyboard(makeConfig({
      setScreen,
      visibleEntries: [makeItemEntry(7)],
      selectedIndexRef: { current: 0 },
    })));
    fireKey("f", { metaKey: true, shiftKey: true });
    expect(setScreen).toHaveBeenCalledWith({ kind: "folderPicker", itemId: 7 });
  });

  it("Escape exits expanded folder section", () => {
    const exitFolderSection = vi.fn();
    renderHook(() => useAppKeyboard(makeConfig({ expandedFolderId: 3, exitFolderSection })));
    fireKey("Escape");
    expect(exitFolderSection).toHaveBeenCalledOnce();
  });

  it("Escape on folderDelete screen navigates to history", () => {
    const setScreen = vi.fn();
    renderHook(() => useAppKeyboard(makeConfig({
      setScreen,
      screen: { kind: "folderDelete", target: { id: 1, name: "x" } },
    })));
    fireKey("Escape");
    expect(setScreen).toHaveBeenCalledWith({ kind: "history" });
  });

  it("Cmd+M enters multiselect when item is selected", () => {
    const multiSelect = makeMultiSelect({ active: false });
    renderHook(() => useAppKeyboard(makeConfig({
      multiSelect,
      visibleEntries: [makeItemEntry(4)],
      selectedIndexRef: { current: 0 },
    })));
    fireKey("m", { metaKey: true });
    expect(multiSelect.enterMode).toHaveBeenCalledWith(4);
  });

  it("Cmd+M exits multiselect when already active", () => {
    const setScreen = vi.fn();
    const multiSelect = makeMultiSelect({ active: true });
    renderHook(() => useAppKeyboard(makeConfig({ setScreen, multiSelect })));
    fireKey("m", { metaKey: true });
    expect(multiSelect.exitMode).toHaveBeenCalledOnce();
    expect(setScreen).toHaveBeenCalledWith({ kind: "history" });
  });

  it("Space toggles selection in multiselect mode", () => {
    const multiSelect = makeMultiSelect({ active: true, selections: [] });
    renderHook(() => useAppKeyboard(makeConfig({
      multiSelect,
      visibleEntries: [makeItemEntry(2)],
      selectedIndexRef: { current: 0 },
    })));
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
    })));
    fireKey("Enter");
    expect(mockInvoke).toHaveBeenCalledWith("paste_item", expect.objectContaining({ itemId: 3 }));
    expect(multiSelect.exitMode).toHaveBeenCalledOnce();
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it("Enter in multiselect with 2+ selections opens separator picker", () => {
    const setScreen = vi.fn();
    const multiSelect = makeMultiSelect({ active: true, selections: [1, 2] });
    renderHook(() => useAppKeyboard(makeConfig({ setScreen, multiSelect })));
    fireKey("Enter");
    expect(setScreen).toHaveBeenCalledWith({ kind: "separatorPicker" });
  });

  it("Escape in multiselect exits multiselect", () => {
    const multiSelect = makeMultiSelect({ active: true });
    renderHook(() => useAppKeyboard(makeConfig({ multiSelect })));
    fireKey("Escape");
    expect(multiSelect.exitMode).toHaveBeenCalledOnce();
  });

  it("Cmd+N calls onTrialError when not activated", () => {
    const onTrialError = vi.fn();
    const setScreen = vi.fn();
    renderHook(() => useAppKeyboard(makeConfig({ isActivated: false, onTrialError, setScreen })));
    fireKey("n", { metaKey: true });
    expect(onTrialError).toHaveBeenCalledWith("Folder organisation");
    expect(setScreen).not.toHaveBeenCalled();
  });

  it("Cmd+Shift+F calls onTrialError when not activated", () => {
    const onTrialError = vi.fn();
    const setScreen = vi.fn();
    renderHook(() => useAppKeyboard(makeConfig({
      isActivated: false,
      onTrialError,
      setScreen,
      visibleEntries: [makeItemEntry(1)],
      selectedIndexRef: { current: 0 },
    })));
    fireKey("f", { metaKey: true, shiftKey: true });
    expect(onTrialError).toHaveBeenCalledWith("Folder organisation");
    expect(setScreen).not.toHaveBeenCalled();
  });

  it("Cmd+M calls onTrialError when not activated and not in multiselect", () => {
    const onTrialError = vi.fn();
    renderHook(() => useAppKeyboard(makeConfig({
      isActivated: false,
      onTrialError,
      visibleEntries: [makeItemEntry(1)],
      selectedIndexRef: { current: 0 },
    })));
    fireKey("m", { metaKey: true });
    expect(onTrialError).toHaveBeenCalledWith("Multi-paste");
  });

  it("Space in multiselect does nothing when no entry at index", () => {
    const multiSelect = makeMultiSelect({ active: true });
    renderHook(() => useAppKeyboard(makeConfig({
      multiSelect,
      visibleEntries: [],
      selectedIndexRef: { current: 0 },
    })));
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
    })));
    fireKey("Enter");
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
  });
});
