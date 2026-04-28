import { useCallback } from "react";
import { useSetAtom } from "jotai";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { previewPanelOpenAtom } from "@/atoms/ui";
import { useUIStore } from "@/store";

const STORAGE_KEY = "kurippa:preview-panel-open";
const LIST_WIDTH = 400;
export const PANEL_WIDTH = 320;
const WINDOW_HEIGHT = 500;

export function usePreviewPanel(): { isOpen: boolean; open: () => void; close: () => void } {
  const { previewPanelOpen: isOpen } = useUIStore();
  const setIsOpen = useSetAtom(previewPanelOpenAtom);

  const open = useCallback(() => {
    setIsOpen(true);
    localStorage.setItem(STORAGE_KEY, "true");
    const expandedWidth = LIST_WIDTH + PANEL_WIDTH;
    getCurrentWebviewWindow()
      .setSize(new LogicalSize(expandedWidth, WINDOW_HEIGHT))
      .then(() => invoke("reclamp_main_window", { width: expandedWidth, height: WINDOW_HEIGHT }))
      .catch(console.error);
  }, [setIsOpen]);

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
  }, [setIsOpen]);

  return { isOpen, open, close };
}
