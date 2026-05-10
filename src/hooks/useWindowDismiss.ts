import { useCallback, useEffect, useRef } from "react";
import { useSetAtom } from "jotai";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { queryAtom } from "@/atoms/navigation";
import { pasteAsPreviewTextAtom } from "@/atoms/ui";
import { useNavigationStore } from "@/store";

export function useWindowDismiss(onShow?: () => void) {
  const { query } = useNavigationStore();
  const setQuery = useSetAtom(queryAtom);
  const setPasteAsPreviewText = useSetAtom(pasteAsPreviewTextAtom);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFocusedAt = useRef<number>(0);
  // Suppress focus-loss dismiss while the user is dragging the window (Windows only).
  // Clicking data-tauri-drag-region on Windows briefly fires a focus-lost event;
  // onDragStart bumps this timestamp so we ignore that transient loss.
  const suppressDismissUntil = useRef<number>(0);

  const onShowRef = useRef(onShow);
  useEffect(() => { onShowRef.current = onShow; });

  const dismiss = useCallback(() => {
    setQuery("");
    setPasteAsPreviewText(null);
    getCurrentWindow().hide().catch(console.error);
  }, [setQuery, setPasteAsPreviewText]);

  const onDragStart = useCallback(() => {
    suppressDismissUntil.current = Date.now() + 1000;
  }, []);

  useEffect(() => {
    const unlistenFocusPromise = getCurrentWindow()
      .onFocusChanged(({ payload: focused }) => {
        if (focused) {
          lastFocusedAt.current = Date.now();
          setQuery("");
          onShowRef.current?.();
          inputRef.current?.focus();
        } else {
          if (Date.now() - lastFocusedAt.current > 300 && Date.now() > suppressDismissUntil.current) {
            dismiss();
          }
        }
      })
      .catch(console.error);

    return () => {
      unlistenFocusPromise.then((unlisten) => unlisten?.()).catch(console.error);
    };
  }, [dismiss, setQuery]);

  return { query, setQuery, inputRef, dismiss, onDragStart };
}
