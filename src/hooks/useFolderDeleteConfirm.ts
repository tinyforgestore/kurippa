import { useEffect } from "react";

export function useFolderDeleteConfirm(onConfirm: () => void, onCancel: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "y" || e.key === "Y") { e.preventDefault(); onConfirm(); }
      if (e.key === "Escape") { e.preventDefault(); onCancel(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onConfirm, onCancel]);
}
