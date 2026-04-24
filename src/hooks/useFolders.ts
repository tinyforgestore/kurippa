import { useEffect, useCallback } from "react";
import { useSetAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { foldersAtom, maxFoldersToastAtom } from "@/atoms/folders";
import { useFoldersStore } from "@/store";

interface UseFoldersParams {
  onTrialError?: (feature: string) => void;
}

export function useFolders({ onTrialError }: UseFoldersParams = {}) {
  const { folders, maxFoldersToast } = useFoldersStore();
  const setFolders = useSetAtom(foldersAtom);
  const setMaxFoldersToast = useSetAtom(maxFoldersToastAtom);

  const loadFolders = useCallback(() => {
    invoke("get_folders")
      .then((f) => setFolders(f as Parameters<typeof setFolders>[0]))
      .catch(console.error);
  }, [setFolders]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const createFolder = useCallback((name: string) => {
    return invoke<{ id: number; name: string; created_at: number; position: number }>("create_folder", { name })
      .then((folder) => {
        setFolders((prev) => [...prev, folder]);
        return folder;
      })
      .catch((err: string) => {
        if (err === "max_folders_reached") {
          setMaxFoldersToast(true);
          setTimeout(() => setMaxFoldersToast(false), 1500);
        } else if (err === "trial") {
          onTrialError?.("Folder organisation");
        }
        throw err;
      });
  }, [onTrialError, setFolders, setMaxFoldersToast]);

  const renameFolder = useCallback((id: number, name: string) => {
    return invoke("rename_folder", { id, name })
      .then(() => {
        setFolders((prev) => prev.map((f) => f.id === id ? { ...f, name } : f));
      })
      .catch(console.error);
  }, [setFolders]);

  const deleteFolder = useCallback((id: number, deleteItems: boolean) => {
    return invoke("delete_folder", { id, deleteItems })
      .then(() => {
        setFolders((prev) => prev.filter((f) => f.id !== id));
      })
      .catch(console.error);
  }, [setFolders]);

  const moveItemToFolder = useCallback((itemId: number, folderId: number) => {
    return invoke("move_item_to_folder", { itemId, folderId })
      .catch((err: string) => {
        if (err === "trial") {
          onTrialError?.("Folder organisation");
        } else {
          console.error(err);
        }
      });
  }, [onTrialError]);

  const removeItemFromFolder = useCallback((itemId: number) => {
    return invoke("remove_item_from_folder", { itemId })
      .catch((err: string) => {
        if (err === "trial") {
          onTrialError?.("Folder organisation");
        } else {
          console.error(err);
        }
      });
  }, [onTrialError]);

  return {
    folders,
    maxFoldersToast,
    loadFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    moveItemToFolder,
    removeItemFromFolder,
  };
}
