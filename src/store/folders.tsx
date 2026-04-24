import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { foldersAtom, maxFoldersToastAtom, folderNameInputValueAtom } from "@/atoms/folders";
import { Folder } from "@/types";

export interface FoldersStore {
  folders: Folder[];
  maxFoldersToast: boolean;
  folderNameInputValue: string;
}

const defaultFoldersStore: FoldersStore = {
  folders: [],
  maxFoldersToast: false,
  folderNameInputValue: "",
};

export const FoldersStoreContext = createContext<FoldersStore>(defaultFoldersStore);

export function FoldersStoreProvider({ children }: { children: ReactNode }) {
  const folders = useAtomValue(foldersAtom);
  const maxFoldersToast = useAtomValue(maxFoldersToastAtom);
  const folderNameInputValue = useAtomValue(folderNameInputValueAtom);
  const value = useMemo<FoldersStore>(
    () => ({ folders, maxFoldersToast, folderNameInputValue }),
    [folders, maxFoldersToast, folderNameInputValue],
  );
  return <FoldersStoreContext.Provider value={value}>{children}</FoldersStoreContext.Provider>;
}

export function useFoldersStore(): FoldersStore {
  return useContext(FoldersStoreContext);
}
