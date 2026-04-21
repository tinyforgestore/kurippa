import { useEffect, useState } from "react";
import { Folder } from "@/types";

interface UseFolderPickerParams {
  folders: Folder[];
  currentFolderId: number | null;
  onSelectFolder: (folderId: number) => void;
  onRemoveFromFolder: () => void;
  onCreateNewFolder: () => void;
  onCancel: () => void;
}

export function useFolderPicker({
  folders,
  currentFolderId,
  onSelectFolder,
  onRemoveFromFolder,
  onCreateNewFolder,
  onCancel,
}: UseFolderPickerParams) {
  const total = folders.length + 1;
  const newFolderIndex = folders.length;
  const [cursorIndex, setCursorIndex] = useState(0);

  const activate = (index: number) => {
    if (index === newFolderIndex) {
      onCreateNewFolder();
    } else {
      const folder = folders[index];
      if (folder.id === currentFolderId) {
        onRemoveFromFolder();
      } else {
        onSelectFolder(folder.id);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCancel(); return; }
      if (e.key === "Tab") {
        e.preventDefault();
        if (e.shiftKey) {
          setCursorIndex((i) => (i - 1 + total) % total);
        } else {
          setCursorIndex((i) => (i + 1) % total);
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursorIndex((i) => (i + 1) % total);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursorIndex((i) => (i - 1 + total) % total);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        activate(cursorIndex);
        return;
      }
      const n = parseInt(e.key, 10);
      if (!isNaN(n) && n >= 1 && n <= folders.length) {
        e.preventDefault();
        activate(n - 1);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [folders, currentFolderId, cursorIndex, total, onSelectFolder, onRemoveFromFolder, onCreateNewFolder, onCancel]);

  return { cursorIndex, setCursorIndex, activate };
}
