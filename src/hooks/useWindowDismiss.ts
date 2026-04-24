import { useCallback, useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { queryAtom } from "@/atoms/navigation";
import { pasteAsPreviewTextAtom } from "@/atoms/ui";

export function useWindowDismiss(onShow?: () => void) {
  const query = useAtomValue(queryAtom);
  const setQuery = useSetAtom(queryAtom);
  const setPasteAsPreviewText = useSetAtom(pasteAsPreviewTextAtom);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFocusedAt = useRef<number>(0);

  const onShowRef = useRef(onShow);
  onShowRef.current = onShow;

  const dismiss = useCallback(() => {
    setQuery("");
    setPasteAsPreviewText(null);
    getCurrentWindow().hide().catch(console.error);
  }, [setQuery, setPasteAsPreviewText]);

  useEffect(() => {
    const unlistenFocusPromise = getCurrentWindow()
      .onFocusChanged(({ payload: focused }) => {
        if (focused) {
          lastFocusedAt.current = Date.now();
          setQuery("");
          onShowRef.current?.();
          inputRef.current?.focus();
        } else {
          if (Date.now() - lastFocusedAt.current > 300) {
            dismiss();
          }
        }
      })
      .catch(console.error);

    return () => {
      unlistenFocusPromise.then((unlisten) => unlisten?.()).catch(console.error);
    };
  }, [dismiss, setQuery]);

  return { query, setQuery, inputRef, dismiss };
}
