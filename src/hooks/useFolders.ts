import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Folder } from "@/types";

interface UseFoldersParams {
  onTrialError?: (feature: string) => void;
}

export function useFolders({ onTrialError }: UseFoldersParams = {}) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [maxFoldersToast, setMaxFoldersToast] = useState(false);

  const loadFolders = useCallback(() => {
    invoke<Folder[]>("get_folders")
      .then(setFolders)
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const createFolder = useCallback((name: string) => {
    return invoke<Folder>("create_folder", { name })
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
  }, [onTrialError]);

  const renameFolder = useCallback((id: number, name: string) => {
    return invoke("rename_folder", { id, name })
      .then(() => {
        setFolders((prev) => prev.map((f) => f.id === id ? { ...f, name } : f));
      })
      .catch(console.error);
  }, []);

  const deleteFolder = useCallback((id: number, deleteItems: boolean) => {
    return invoke("delete_folder", { id, deleteItems })
      .then(() => {
        setFolders((prev) => prev.filter((f) => f.id !== id));
      })
      .catch(console.error);
  }, []);

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
    loadFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    moveItemToFolder,
    removeItemFromFolder,
    maxFoldersToast,
  };
}
