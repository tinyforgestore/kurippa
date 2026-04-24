import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { previewPanelOpenAtom, pasteAsPreviewTextAtom, clearConfirmShowAtom, updateInfoAtom } from "@/atoms/ui";

export interface UIStore {
  previewPanelOpen: boolean;
  pasteAsPreviewText: string | null;
  clearConfirmShow: boolean;
  updateInfo: { version: string } | null;
}

const defaultUIStore: UIStore = {
  previewPanelOpen: false,
  pasteAsPreviewText: null,
  clearConfirmShow: false,
  updateInfo: null,
};

export const UIStoreContext = createContext<UIStore>(defaultUIStore);

export function UIStoreProvider({ children }: { children: ReactNode }) {
  const previewPanelOpen = useAtomValue(previewPanelOpenAtom);
  const pasteAsPreviewText = useAtomValue(pasteAsPreviewTextAtom);
  const clearConfirmShow = useAtomValue(clearConfirmShowAtom);
  const updateInfo = useAtomValue(updateInfoAtom);
  const value = useMemo<UIStore>(
    () => ({ previewPanelOpen, pasteAsPreviewText, clearConfirmShow, updateInfo }),
    [previewPanelOpen, pasteAsPreviewText, clearConfirmShow, updateInfo],
  );
  return <UIStoreContext.Provider value={value}>{children}</UIStoreContext.Provider>;
}

export function useUIStore(): UIStore {
  return useContext(UIStoreContext);
}
