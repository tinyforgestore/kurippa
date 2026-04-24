import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { allItemsAtom, deletingIdAtom, liftingIdAtom, landingIdAtom } from "@/atoms/clipboard";
import { resultsAtom, visibleEntriesAtom } from "@/atoms/derived";
import { ClipboardItem, FuzzyResult, ListEntry } from "@/types";

export interface ClipboardStore {
  allItems: ClipboardItem[];
  results: FuzzyResult[];
  visibleEntries: ListEntry[];
  liftingId: number | null;
  landingId: number | null;
  deletingId: number | null;
}

const defaultClipboardStore: ClipboardStore = {
  allItems: [],
  results: [],
  visibleEntries: [],
  liftingId: null,
  landingId: null,
  deletingId: null,
};

export const ClipboardStoreContext = createContext<ClipboardStore>(defaultClipboardStore);

export function ClipboardStoreProvider({ children }: { children: ReactNode }) {
  const allItems = useAtomValue(allItemsAtom);
  const results = useAtomValue(resultsAtom);
  const visibleEntries = useAtomValue(visibleEntriesAtom);
  const liftingId = useAtomValue(liftingIdAtom);
  const landingId = useAtomValue(landingIdAtom);
  const deletingId = useAtomValue(deletingIdAtom);
  const value = useMemo<ClipboardStore>(
    () => ({ allItems, results, visibleEntries, liftingId, landingId, deletingId }),
    [allItems, results, visibleEntries, liftingId, landingId, deletingId],
  );
  return <ClipboardStoreContext.Provider value={value}>{children}</ClipboardStoreContext.Provider>;
}

export function useClipboardStore(): ClipboardStore {
  return useContext(ClipboardStoreContext);
}
