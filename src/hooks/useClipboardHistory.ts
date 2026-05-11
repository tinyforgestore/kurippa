import { useCallback, useEffect, useRef } from "react";
import { useSetAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { error as logError, info as logInfo } from "@tauri-apps/plugin-log";
import { ClipboardItem, HISTORY_DISPLAY_LIMIT } from "@/types";
import { allItemsAtom } from "@/atoms/clipboard";
import { CLIPBOARD_UPDATED, HISTORY_CLEARED } from "@/constants/events";
import { useClipboardStore } from "@/store";

export function useClipboardHistory() {
  const { allItems, results } = useClipboardStore();
  const setAllItems = useSetAtom(allItemsAtom);
  const ignoringClipboardUpdatesUntil = useRef<number>(0);

  useEffect(() => {
    invoke<ClipboardItem[]>("get_history", { limit: HISTORY_DISPLAY_LIMIT })
      .then((history) => {
        setAllItems(history);
      })
      .catch(console.error);

    const unlistenPromise = listen<ClipboardItem>(CLIPBOARD_UPDATED, (event) => {
      if (Date.now() < ignoringClipboardUpdatesUntil.current) return;
      setAllItems((prev) => [event.payload, ...prev.filter((i) => i.id !== event.payload.id)].slice(0, HISTORY_DISPLAY_LIMIT));
    });

    const unlistenClearedPromise = listen(HISTORY_CLEARED, () => {
      ignoringClipboardUpdatesUntil.current = Date.now() + 600;
      setAllItems((prev) => prev.filter((i) => i.pinned || i.folder_id !== null));
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten()).catch(console.error);
      unlistenClearedPromise.then((unlisten) => unlisten()).catch(console.error);
    };
  }, [setAllItems]);

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

  const clearNonPinned = useCallback(() => {
    ignoringClipboardUpdatesUntil.current = Date.now() + 600;
    setAllItems((prev) => prev.filter((i) => i.pinned || i.folder_id !== null));
  }, [setAllItems]);

  const reloadHistory = useCallback(() => {
    invoke<ClipboardItem[]>("get_history", { limit: HISTORY_DISPLAY_LIMIT })
      .then((history) => {
        setAllItems(history);
      })
      .catch(console.error);
  }, [setAllItems]);

  return { results, pinItem, unpinItem, deleteItem, togglePinItem, clearNonPinned, reloadHistory };
}
