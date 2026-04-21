import { useCallback, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/window";

const STORAGE_KEY = "kurippa:preview-panel-open";
const LIST_WIDTH = 400;
export const PANEL_WIDTH = 320;
const WINDOW_HEIGHT = 500;

export function usePreviewPanel(): { isOpen: boolean; open: () => void; close: () => void } {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
    localStorage.setItem(STORAGE_KEY, "true");
    getCurrentWebviewWindow()
      .setSize(new LogicalSize(LIST_WIDTH + PANEL_WIDTH, WINDOW_HEIGHT))
      .catch(console.error);
  }, []);

  const close = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) {
        getCurrentWebviewWindow()
          .setSize(new LogicalSize(LIST_WIDTH, WINDOW_HEIGHT))
          .catch(console.error);
      }
      return false;
    });
    localStorage.setItem(STORAGE_KEY, "false");
  }, []);

  return { isOpen, open, close };
}
