import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function useWindowDismiss(onShow?: () => void) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFocusedAt = useRef<number>(0);

  const dismiss = useCallback(() => {
    setQuery("");
    getCurrentWindow().hide().catch(console.error);
  }, []);

  useEffect(() => {
    const unlistenFocusPromise = getCurrentWindow()
      .onFocusChanged(({ payload: focused }) => {
        if (focused) {
          lastFocusedAt.current = Date.now();
          // Clear filter, reset selection, and re-focus input on every show.
          setQuery("");
          onShow?.();
          inputRef.current?.focus();
        } else {
          // Guard: ignore focus-loss that fires during the show() transition.
          if (Date.now() - lastFocusedAt.current > 300) {
            dismiss();
          }
        }
      })
      .catch(console.error);

    return () => {
      unlistenFocusPromise.then((unlisten) => unlisten?.()).catch(console.error);
    };
  }, [dismiss, onShow]);

  return { query, setQuery, inputRef, dismiss };
}
