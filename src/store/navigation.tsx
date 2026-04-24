import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { queryAtom, selectedIndexAtom, expandedSectionAtom } from "@/atoms/navigation";
import { inPinnedSectionAtom, expandedFolderIdAtom } from "@/atoms/derived";

export interface NavigationStore {
  query: string;
  selectedIndex: number;
  expandedSection: null | "pinned" | number;
  inPinnedSection: boolean;
  expandedFolderId: number | null;
}

const defaultNavigationStore: NavigationStore = {
  query: "",
  selectedIndex: 0,
  expandedSection: null,
  inPinnedSection: false,
  expandedFolderId: null,
};

export const NavigationStoreContext = createContext<NavigationStore>(defaultNavigationStore);

export function NavigationStoreProvider({ children }: { children: ReactNode }) {
  const query = useAtomValue(queryAtom);
  const selectedIndex = useAtomValue(selectedIndexAtom);
  const expandedSection = useAtomValue(expandedSectionAtom);
  const inPinnedSection = useAtomValue(inPinnedSectionAtom);
  const expandedFolderId = useAtomValue(expandedFolderIdAtom);
  const value = useMemo<NavigationStore>(
    () => ({ query, selectedIndex, expandedSection, inPinnedSection, expandedFolderId }),
    [query, selectedIndex, expandedSection, inPinnedSection, expandedFolderId],
  );
  return <NavigationStoreContext.Provider value={value}>{children}</NavigationStoreContext.Provider>;
}

export function useNavigationStore(): NavigationStore {
  return useContext(NavigationStoreContext);
}
