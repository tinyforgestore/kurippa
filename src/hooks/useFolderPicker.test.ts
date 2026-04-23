import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useFolderPicker } from "@/hooks/useFolderPicker";
import { Folder } from "@/types";

function makeFolder(id: number, name = "F"): Folder {
  return { id, name, created_at: 0, position: 0 };
}

function makeParams(overrides: Partial<Parameters<typeof useFolderPicker>[0]> = {}) {
  return {
    folders: [makeFolder(1), makeFolder(2)],
    currentFolderId: null,
    onSelectFolder: vi.fn(),
    onRemoveFromFolder: vi.fn(),
    onCreateNewFolder: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

function fireKey(key: string, modifiers: Partial<KeyboardEventInit> = {}) {
  document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...modifiers }));
}

describe("useFolderPicker", () => {
  beforeEach(() => vi.clearAllMocks());

  it("initial cursorIndex is 0", () => {
    const { result } = renderHook(() => useFolderPicker(makeParams()));
    expect(result.current.cursorIndex).toBe(0);
  });

  it("ArrowDown increments cursor and wraps (0→1→2→0 for 2 folders)", () => {
    const { result } = renderHook(() => useFolderPicker(makeParams()));
    act(() => fireKey("ArrowDown"));
    expect(result.current.cursorIndex).toBe(1);
    act(() => fireKey("ArrowDown"));
    expect(result.current.cursorIndex).toBe(2);
    act(() => fireKey("ArrowDown"));
    expect(result.current.cursorIndex).toBe(0);
  });

  it("ArrowUp decrements cursor and wraps", () => {
    const { result } = renderHook(() => useFolderPicker(makeParams()));
    act(() => fireKey("ArrowUp"));
    expect(result.current.cursorIndex).toBe(2);
    act(() => fireKey("ArrowUp"));
    expect(result.current.cursorIndex).toBe(1);
    act(() => fireKey("ArrowUp"));
    expect(result.current.cursorIndex).toBe(0);
  });

  it("Tab cycles cursor forward", () => {
    const { result } = renderHook(() => useFolderPicker(makeParams()));
    act(() => fireKey("Tab"));
    expect(result.current.cursorIndex).toBe(1);
    act(() => fireKey("Tab"));
    expect(result.current.cursorIndex).toBe(2);
    act(() => fireKey("Tab"));
    expect(result.current.cursorIndex).toBe(0);
  });

  it("Shift+Tab cycles cursor backward", () => {
    const { result } = renderHook(() => useFolderPicker(makeParams()));
    act(() => fireKey("Tab", { shiftKey: true }));
    expect(result.current.cursorIndex).toBe(2);
    act(() => fireKey("Tab", { shiftKey: true }));
    expect(result.current.cursorIndex).toBe(1);
  });

  it("Escape calls onCancel", () => {
    const params = makeParams();
    renderHook(() => useFolderPicker(params));
    act(() => fireKey("Escape"));
    expect(params.onCancel).toHaveBeenCalledOnce();
  });

  it("Enter on folder whose id !== currentFolderId calls onSelectFolder(id)", () => {
    const params = makeParams({ currentFolderId: null });
    const { result } = renderHook(() => useFolderPicker(params));
    act(() => result.current.setCursorIndex(0));
    act(() => fireKey("Enter"));
    expect(params.onSelectFolder).toHaveBeenCalledWith(1);
    expect(params.onRemoveFromFolder).not.toHaveBeenCalled();
  });

  it("Enter on folder whose id === currentFolderId calls onRemoveFromFolder", () => {
    const params = makeParams({ currentFolderId: 1 });
    const { result } = renderHook(() => useFolderPicker(params));
    act(() => result.current.setCursorIndex(0));
    act(() => fireKey("Enter"));
    expect(params.onRemoveFromFolder).toHaveBeenCalledOnce();
    expect(params.onSelectFolder).not.toHaveBeenCalled();
  });

  it("Enter when cursor is at newFolderIndex calls onCreateNewFolder", () => {
    const params = makeParams();
    const { result } = renderHook(() => useFolderPicker(params));
    // newFolderIndex = folders.length = 2
    act(() => result.current.setCursorIndex(2));
    act(() => fireKey("Enter"));
    expect(params.onCreateNewFolder).toHaveBeenCalledOnce();
  });

  it("numeric key 1 activates folders[0] and calls onSelectFolder(folders[0].id)", () => {
    const params = makeParams();
    renderHook(() => useFolderPicker(params));
    act(() => fireKey("1"));
    expect(params.onSelectFolder).toHaveBeenCalledWith(1);
  });

  it("numeric key 2 activates folders[1]", () => {
    const params = makeParams();
    renderHook(() => useFolderPicker(params));
    act(() => fireKey("2"));
    expect(params.onSelectFolder).toHaveBeenCalledWith(2);
  });

  it("numeric key beyond folders.length does nothing", () => {
    const params = makeParams();
    renderHook(() => useFolderPicker(params));
    act(() => fireKey("3"));
    expect(params.onSelectFolder).not.toHaveBeenCalled();
    expect(params.onCreateNewFolder).not.toHaveBeenCalled();
  });

  it("activate(newFolderIndex) calls onCreateNewFolder directly", () => {
    const params = makeParams();
    const { result } = renderHook(() => useFolderPicker(params));
    act(() => result.current.activate(2));
    expect(params.onCreateNewFolder).toHaveBeenCalledOnce();
  });
});
