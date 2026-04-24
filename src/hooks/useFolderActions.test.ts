import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { Provider, createStore } from "jotai";
import { StoreProvider } from "@/store";
import { useFolderActions } from "@/hooks/useFolderActions";
import { Folder } from "@/types";

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

function makeFolder(id = 1): Folder {
  return { id, name: "Test", created_at: 0, position: 0 };
}

function makeWrapper() {
  const store = createStore();
  return { wrapper: ({ children }: { children: React.ReactNode }) => createElement(Provider, { store }, createElement(StoreProvider, null, children)) };
}

function makeParams(overrides: Partial<Parameters<typeof useFolderActions>[0]> = {}) {
  return {
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
    mockState = null;
  });

  describe("moveItemToFolder", () => {
    it("delegates to moveItemToFolder and reloads history", async () => {
      const params = makeParams();
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useFolderActions(params), { wrapper });
      await act(() => result.current.moveItemToFolder(1, 2));
      expect(params.moveItemToFolder).toHaveBeenCalledWith(1, 2);
      expect(params.reloadHistory).toHaveBeenCalledOnce();
    });
  });

  describe("removeItemFromFolder", () => {
    it("delegates to removeItemFromFolder and reloads history", async () => {
      const params = makeParams();
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useFolderActions(params), { wrapper });
      await act(() => result.current.removeItemFromFolder(5));
      expect(params.removeItemFromFolder).toHaveBeenCalledWith(5);
      expect(params.reloadHistory).toHaveBeenCalledOnce();
    });
  });

  describe("confirmFolderNameInput", () => {
    it("does nothing when pathname is not /folder-name-input", () => {
      mockPathname = "/";
      const params = makeParams();
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useFolderActions(params), { wrapper });
      act(() => result.current.confirmFolderNameInput());
      expect(params.createFolder).not.toHaveBeenCalled();
    });

    it("does nothing when trimmed name is empty", () => {
      mockPathname = "/folder-name-input";
      mockState = { mode: "create", targetId: null, pickerItemId: null };
      const params = makeParams();
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useFolderActions(params), { wrapper });
      act(() => result.current.confirmFolderNameInput());
      expect(params.createFolder).not.toHaveBeenCalled();
    });

    it("create mode: calls createFolder, loadFolders, reloadHistory and navigates to history", async () => {
      mockPathname = "/folder-name-input";
      mockState = { mode: "create", targetId: null, pickerItemId: null };
      const params = makeParams();
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useFolderActions(params), { wrapper });
      act(() => result.current.setFolderNameInputValue("Work"));
      await act(() => { result.current.confirmFolderNameInput(); });
      expect(params.createFolder).toHaveBeenCalledWith("Work");
      expect(params.loadFolders).toHaveBeenCalledOnce();
      expect(params.reloadHistory).toHaveBeenCalledOnce();
      expect(mockNav.toHistory).toHaveBeenCalledOnce();
    });

    it("create mode with pickerItemId: calls moveItemToFolder after createFolder", async () => {
      mockPathname = "/folder-name-input";
      mockState = { mode: "create", targetId: null, pickerItemId: 7 };
      const newFolder = makeFolder(42);
      const params = makeParams({
        createFolder: vi.fn().mockResolvedValue(newFolder),
      });
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useFolderActions(params), { wrapper });
      act(() => result.current.setFolderNameInputValue("Work"));
      await act(() => { result.current.confirmFolderNameInput(); });
      expect(params.moveItemToFolder).toHaveBeenCalledWith(7, 42);
    });

    it("rename mode: calls renameFolder with targetId", async () => {
      mockPathname = "/folder-name-input";
      mockState = { mode: "rename", targetId: 3, pickerItemId: null };
      const params = makeParams();
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useFolderActions(params), { wrapper });
      act(() => result.current.setFolderNameInputValue("Renamed"));
      await act(() => { result.current.confirmFolderNameInput(); });
      expect(params.renameFolder).toHaveBeenCalledWith(3, "Renamed");
      expect(params.loadFolders).toHaveBeenCalledOnce();
    });
  });

  describe("confirmFolderDelete", () => {
    it("does nothing when pathname is not /folder-delete", () => {
      mockPathname = "/";
      const params = makeParams();
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useFolderActions(params), { wrapper });
      act(() => result.current.confirmFolderDelete(true));
      expect(params.deleteFolder).not.toHaveBeenCalled();
    });

    it("calls deleteFolder, loadFolders, reloadHistory and navigates to history", async () => {
      mockPathname = "/folder-delete";
      mockState = { target: { id: 9, name: "Old" } };
      const params = makeParams();
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useFolderActions(params), { wrapper });
      await act(() => { result.current.confirmFolderDelete(false); });
      expect(params.deleteFolder).toHaveBeenCalledWith(9, false);
      expect(params.loadFolders).toHaveBeenCalledOnce();
      expect(params.reloadHistory).toHaveBeenCalledOnce();
      expect(mockNav.toHistory).toHaveBeenCalledOnce();
    });
  });
});
