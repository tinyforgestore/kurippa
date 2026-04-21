import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { error as logError, info as logInfo } from "@tauri-apps/plugin-log";
import { ClipboardItem, Folder, FuzzyResult, HISTORY_DISPLAY_LIMIT } from "@/types";
import { fuzzyMatch } from "@/utils/fuzzyMatch";

export function useClipboardHistory(query: string, folders: Folder[]) {
  const [allItems, setAllItems] = useState<ClipboardItem[]>([]);
  const ignoringClipboardUpdatesUntil = useRef<number>(0);
  const deferredQuery = useDeferredValue(query);

  // Initial load + live updates
  useEffect(() => {
    invoke<ClipboardItem[]>("get_history", { limit: HISTORY_DISPLAY_LIMIT })
      .then((history) => {
        setAllItems(history);
      })
      .catch(console.error);

    const unlistenPromise = listen<ClipboardItem>("clipboard-updated", (event) => {
      if (Date.now() < ignoringClipboardUpdatesUntil.current) return;
      setAllItems((prev) => [event.payload, ...prev.filter((i) => i.id !== event.payload.id)].slice(0, HISTORY_DISPLAY_LIMIT));
    });

    const unlistenClearedPromise = listen("history-cleared", () => {
      ignoringClipboardUpdatesUntil.current = Date.now() + 600;
      setAllItems((prev) => prev.filter((i) => i.pinned || i.folder_id !== null));
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten()).catch(console.error);
      unlistenClearedPromise.then((unlisten) => unlisten()).catch(console.error);
    };
  }, []);

  const results = useMemo((): FuzzyResult[] => {
    const folderMap = new Map(folders.map((f) => [f.id, f.name]));
    if (deferredQuery.trim() === "") {
      return allItems.map((item) => ({
        item,
        highlighted: null,
        score: 0,
        folder_name: item.folder_id != null ? (folderMap.get(item.folder_id) ?? null) : null,
      }));
    }
    const matched: FuzzyResult[] = [];
    for (const item of allItems) {
      const folderName = item.folder_id != null ? (folderMap.get(item.folder_id) ?? null) : null;
      const textMatch = item.text ? fuzzyMatch(deferredQuery, item.text) : null;
      const imageMatch = !textMatch && item.image_path ? fuzzyMatch(deferredQuery, item.image_path) : null;
      const folderMatch = !textMatch && !imageMatch && folderName ? fuzzyMatch(deferredQuery, folderName) : null;
      if (!textMatch && !imageMatch && !folderMatch) continue;
      matched.push({
        item,
        highlighted: textMatch?.highlighted ?? null,
        score: textMatch?.score ?? imageMatch?.score ?? folderMatch!.score,
        folder_name: folderName,
      });
    }
    matched.sort((a, b) => b.score - a.score || b.item.id - a.item.id);
    return matched.slice(0, HISTORY_DISPLAY_LIMIT);
  }, [deferredQuery, allItems, folders]);

  const pinItem = (id: number): Promise<void> =>
    invoke("pin_item", { id }).then(() => {
      setAllItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, pinned: true } : item))
      );
    });

  const unpinItem = (id: number): Promise<void> =>
    invoke("unpin_item", { id }).then(() => {
      setAllItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, pinned: false } : item))
      );
    });

  const deleteItem = (id: number) => {
    logInfo(`deleteItem called for id=${id}`);
    setAllItems((prev) => prev.filter((item) => item.id !== id));
    invoke("delete_item", { id }).catch((e) =>
      logError(`delete_item invoke failed for id=${id}: ${e}`)
    );
  };

  const togglePinItem = (id: number): Promise<void> => {
    const item = allItems.find((i) => i.id === id);
    if (!item) return Promise.resolve();
    return item.pinned ? unpinItem(id) : pinItem(id);
  };

  // Optimistic clear — keeps pinned and folder items in state immediately.
  // Called directly from useAppState so the UI updates even if the
  // history-cleared event listener has a stale HMR closure.
  const clearNonPinned = useCallback(() => {
    ignoringClipboardUpdatesUntil.current = Date.now() + 600;
    setAllItems((prev) => prev.filter((i) => i.pinned || i.folder_id !== null));
  }, []);

  const reloadHistory = useCallback(() => {
    invoke<ClipboardItem[]>("get_history", { limit: HISTORY_DISPLAY_LIMIT })
      .then((history) => {
        setAllItems(history);
      })
      .catch(console.error);
  }, []);

  return { results, pinItem, unpinItem, deleteItem, togglePinItem, clearNonPinned, reloadHistory };
}
