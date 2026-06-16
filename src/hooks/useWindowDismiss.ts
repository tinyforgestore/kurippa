import { useCallback, useEffect, useRef } from "react";
import { useSetAtom } from "jotai";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { queryAtom } from "@/atoms/navigation";
import { pasteAsPreviewTextAtom } from "@/atoms/ui";
import { PANEL_DISMISSED } from "@/constants/events";
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

  // macOS only: tauri-nspanel swizzles NSWindow, breaking onFocusChanged for
  // focus-loss dismiss. The native resign-key delegate (window.rs) orders the
  // panel out and emits PANEL_DISMISSED — here we run the same reset dismiss()
  // does. The panel is already hidden natively; dismiss()'s hide() is a harmless
  // no-op on an already-hidden window. Only fires on macOS, so it coexists with
  // the onFocusChanged path (which still drives dismiss on Windows/Linux).
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen(PANEL_DISMISSED, () => {
      dismiss();
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(console.error);

    return () => {
      unlisten?.();
    };
  }, [dismiss]);

  return { query, setQuery, inputRef, dismiss, onDragStart };
}
