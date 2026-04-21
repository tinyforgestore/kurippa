import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useFolderActions } from "@/hooks/useFolderActions";
import { AppScreen } from "@/hooks/useAppState";
import { Folder } from "@/types";

function makeFolder(id = 1): Folder {
  return { id, name: "Test", created_at: 0, position: 0 };
}

function makeParams(overrides: Partial<Parameters<typeof useFolderActions>[0]> = {}) {
  return {
    screen: { kind: "history" } as AppScreen,
    setScreen: vi.fn(),
    createFolder: vi.fn().mockResolvedValue(makeFolder()),
    renameFolder: vi.fn().mockResolvedValue(undefined),
    deleteFolder: vi.fn().mockResolvedValue(undefined),
    moveItemToFolder: vi.fn().mockResolvedValue(undefined),
    removeItemFromFolder: vi.fn().mockResolvedValue(undefined),
    loadFolders: vi.fn().mockResolvedValue(undefined),
    reloadHistory: vi.fn(),
    ...overrides,
  };
}

describe("useFolderActions", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("moveItemToFolder", () => {
    it("delegates to moveItemToFolder and reloads history", async () => {
      const params = makeParams();
      const { result } = renderHook(() => useFolderActions(params));
      await act(() => result.current.moveItemToFolder(1, 2));
      expect(params.moveItemToFolder).toHaveBeenCalledWith(1, 2);
      expect(params.reloadHistory).toHaveBeenCalledOnce();
    });
  });

  describe("removeItemFromFolder", () => {
    it("delegates to removeItemFromFolder and reloads history", async () => {
      const params = makeParams();
      const { result } = renderHook(() => useFolderActions(params));
      await act(() => result.current.removeItemFromFolder(5));
      expect(params.removeItemFromFolder).toHaveBeenCalledWith(5);
      expect(params.reloadHistory).toHaveBeenCalledOnce();
    });
  });

  describe("confirmFolderNameInput", () => {
    it("does nothing when screen is not folderNameInput", () => {
      const params = makeParams({ screen: { kind: "history" } });
      const { result } = renderHook(() => useFolderActions(params));
      act(() => result.current.confirmFolderNameInput());
      expect(params.createFolder).not.toHaveBeenCalled();
    });

    it("does nothing when trimmed name is empty", () => {
      const params = makeParams({
        screen: { kind: "folderNameInput", mode: "create", targetId: null, pickerItemId: null },
      });
      const { result } = renderHook(() => useFolderActions(params));
      // folderNameInputValue starts as ""
      act(() => result.current.confirmFolderNameInput());
      expect(params.createFolder).not.toHaveBeenCalled();
    });

    it("create mode: calls createFolder, loadFolders, reloadHistory", async () => {
      const params = makeParams({
        screen: { kind: "folderNameInput", mode: "create", targetId: null, pickerItemId: null },
      });
      const { result } = renderHook(() => useFolderActions(params));
      act(() => result.current.setFolderNameInputValue("Work"));
      await act(() => { result.current.confirmFolderNameInput(); });
      expect(params.createFolder).toHaveBeenCalledWith("Work");
      expect(params.loadFolders).toHaveBeenCalledOnce();
      expect(params.reloadHistory).toHaveBeenCalledOnce();
      expect(params.setScreen).toHaveBeenCalledWith({ kind: "history" });
    });

    it("create mode with pickerItemId: calls moveItemToFolder after createFolder", async () => {
      const newFolder = makeFolder(42);
      const params = makeParams({
        screen: { kind: "folderNameInput", mode: "create", targetId: null, pickerItemId: 7 },
        createFolder: vi.fn().mockResolvedValue(newFolder),
      });
      const { result } = renderHook(() => useFolderActions(params));
      act(() => result.current.setFolderNameInputValue("Work"));
      await act(() => { result.current.confirmFolderNameInput(); });
      expect(params.moveItemToFolder).toHaveBeenCalledWith(7, 42);
    });

    it("rename mode: calls renameFolder with targetId", async () => {
      const params = makeParams({
        screen: { kind: "folderNameInput", mode: "rename", targetId: 3, pickerItemId: null },
      });
      const { result } = renderHook(() => useFolderActions(params));
      act(() => result.current.setFolderNameInputValue("Renamed"));
      await act(() => { result.current.confirmFolderNameInput(); });
      expect(params.renameFolder).toHaveBeenCalledWith(3, "Renamed");
      expect(params.loadFolders).toHaveBeenCalledOnce();
    });
  });

  describe("confirmFolderDelete", () => {
    it("does nothing when screen is not folderDelete", () => {
      const params = makeParams({ screen: { kind: "history" } });
      const { result } = renderHook(() => useFolderActions(params));
      act(() => result.current.confirmFolderDelete(true));
      expect(params.deleteFolder).not.toHaveBeenCalled();
    });

    it("calls deleteFolder, loadFolders, reloadHistory and navigates to history", async () => {
      const params = makeParams({
        screen: { kind: "folderDelete", target: { id: 9, name: "Old" } },
      });
      const { result } = renderHook(() => useFolderActions(params));
      await act(() => { result.current.confirmFolderDelete(false); });
      expect(params.deleteFolder).toHaveBeenCalledWith(9, false);
      expect(params.loadFolders).toHaveBeenCalledOnce();
      expect(params.reloadHistory).toHaveBeenCalledOnce();
      expect(params.setScreen).toHaveBeenCalledWith({ kind: "history" });
    });
  });
});
