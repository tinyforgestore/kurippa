import { useCallback, useEffect, useRef, useState } from "react";
import { DELETE_DURATION_MS } from "@/constants/animation";
import { info } from "@tauri-apps/plugin-log";

export function useDeleteAnimation(
  onDelete: (id: number) => void,
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>,
  getEntriesLength: () => number
): { deletingId: number | null; triggerDelete: (id: number) => void } {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel any pending delete timer on unmount.
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

  const triggerDelete = useCallback(
    (id: number) => {
      info(`Deleting item with ID: ${id}`);
      setDeletingId(id);
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = setTimeout(() => {
        try {
          onDelete(id);
        } finally {
          setDeletingId(null);
          setSelectedIndex((i) => Math.max(0, Math.min(i, getEntriesLength() - 2)));
        }
      }, DELETE_DURATION_MS);
    },
    [onDelete, setSelectedIndex, getEntriesLength]
  );

  return { deletingId, triggerDelete };
}
