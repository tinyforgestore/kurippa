import { useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useLocation } from "react-router-dom";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { Folder } from "@/types";
import { folderNameInputValueAtom } from "@/atoms/folders";

interface UseFolderActionsParams {
  createFolder: (name: string) => Promise<Folder>;
  renameFolder: (id: number, name: string) => Promise<void | undefined>;
  deleteFolder: (id: number, deleteItems: boolean) => Promise<void | undefined>;
  moveItemToFolder: (itemId: number, folderId: number) => Promise<unknown>;
  removeItemFromFolder: (itemId: number) => Promise<unknown>;
  loadFolders: () => void;
  reloadHistory: () => void;
}

export function useFolderActions({
  createFolder,
  renameFolder,
  deleteFolder,
  moveItemToFolder: _moveItemToFolder,
  removeItemFromFolder: _removeItemFromFolder,
  loadFolders,
  reloadHistory,
}: UseFolderActionsParams) {
  const location = useLocation();
  const nav = useAppNavigation();
  const folderNameInputValue = useAtomValue(folderNameInputValueAtom);
  const setFolderNameInputValue = useSetAtom(folderNameInputValueAtom);

  const moveItemToFolder = useCallback((itemId: number, folderId: number) => {
    return _moveItemToFolder(itemId, folderId).then(() => reloadHistory());
  }, [_moveItemToFolder, reloadHistory]);

  const removeItemFromFolder = useCallback((itemId: number) => {
    return _removeItemFromFolder(itemId).then(() => reloadHistory());
  }, [_removeItemFromFolder, reloadHistory]);

  const confirmFolderNameInput = useCallback(() => {
    if (location.pathname !== "/folder-name-input") return;
    const { mode, targetId, pickerItemId } = location.state as {
      mode: "create" | "rename";
      targetId: number | null;
      pickerItemId: number | null;
    };
    const name = folderNameInputValue.trim();
    nav.toHistory();
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
  }, [location, nav, folderNameInputValue, createFolder, _moveItemToFolder, renameFolder, loadFolders, reloadHistory, setFolderNameInputValue]);

  const confirmFolderDelete = useCallback((deleteItems: boolean) => {
    if (location.pathname !== "/folder-delete") return;
    const { target } = location.state as { target: { id: number; name: string } };
    nav.toHistory();
    deleteFolder(target.id, deleteItems)
      .then(() => loadFolders())
      .then(() => reloadHistory())
      .catch(console.error);
  }, [location, nav, deleteFolder, loadFolders, reloadHistory]);

  return {
    folderNameInputValue,
    setFolderNameInputValue,
    confirmFolderNameInput,
    confirmFolderDelete,
    moveItemToFolder,
    removeItemFromFolder,
  };
}
