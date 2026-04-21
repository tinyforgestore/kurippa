import { useCallback, useState } from "react";
import { AppScreen } from "@/hooks/useAppState";
import { Folder } from "@/types";

interface UseFolderActionsParams {
  screen: AppScreen;
  setScreen: (s: AppScreen) => void;
  createFolder: (name: string) => Promise<Folder>;
  renameFolder: (id: number, name: string) => Promise<void | undefined>;
  deleteFolder: (id: number, deleteItems: boolean) => Promise<void | undefined>;
  moveItemToFolder: (itemId: number, folderId: number) => Promise<unknown>;
  removeItemFromFolder: (itemId: number) => Promise<unknown>;
  loadFolders: () => void;
  reloadHistory: () => void;
}

export function useFolderActions({
  screen,
  setScreen,
  createFolder,
  renameFolder,
  deleteFolder,
  moveItemToFolder: _moveItemToFolder,
  removeItemFromFolder: _removeItemFromFolder,
  loadFolders,
  reloadHistory,
}: UseFolderActionsParams) {
  const [folderNameInputValue, setFolderNameInputValue] = useState("");

  const moveItemToFolder = useCallback((itemId: number, folderId: number) => {
    return _moveItemToFolder(itemId, folderId).then(() => reloadHistory());
  }, [_moveItemToFolder, reloadHistory]);

  const removeItemFromFolder = useCallback((itemId: number) => {
    return _removeItemFromFolder(itemId).then(() => reloadHistory());
  }, [_removeItemFromFolder, reloadHistory]);

  const confirmFolderNameInput = useCallback(() => {
    if (screen.kind !== "folderNameInput") return;
    const name = folderNameInputValue.trim();
    const { mode, targetId, pickerItemId } = screen;
    setScreen({ kind: "history" });
    setFolderNameInputValue("");
    if (!name) return;
    if (mode === "create") {
      createFolder(name)
        .then((newFolder) => {
          if (pickerItemId !== null) {
            return _moveItemToFolder(pickerItemId, newFolder.id);
          }
        })
        .then(() => loadFolders())
        .then(() => reloadHistory())
        .catch(console.error);
    } else if (mode === "rename" && targetId !== null) {
      renameFolder(targetId, name)
        .then(() => loadFolders())
        .catch(console.error);
    }
  }, [screen, setScreen, folderNameInputValue, createFolder, _moveItemToFolder, renameFolder, loadFolders, reloadHistory]);

  const confirmFolderDelete = useCallback((deleteItems: boolean) => {
    if (screen.kind !== "folderDelete") return;
    const { target } = screen;
    setScreen({ kind: "history" });
    deleteFolder(target.id, deleteItems)
      .then(() => loadFolders())
      .then(() => reloadHistory())
      .catch(console.error);
  }, [screen, setScreen, deleteFolder, loadFolders, reloadHistory]);

  return {
    folderNameInputValue,
    setFolderNameInputValue,
    confirmFolderNameInput,
    confirmFolderDelete,
    moveItemToFolder,
    removeItemFromFolder,
  };
}
