import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import {
  multiSelectActiveAtom,
  multiSelectSelectionsAtom,
  multiSelectFlashingIdAtom,
  multiSelectMaxToastVisibleAtom,
} from "@/atoms/multiSelect";

export interface MultiSelectStore {
  active: boolean;
  selections: number[];
  flashingId: number | null;
  maxToastVisible: boolean;
}

const defaultMultiSelectStore: MultiSelectStore = {
  active: false,
  selections: [],
  flashingId: null,
  maxToastVisible: false,
};

export const MultiSelectStoreContext = createContext<MultiSelectStore>(defaultMultiSelectStore);

export function MultiSelectStoreProvider({ children }: { children: ReactNode }) {
  const active = useAtomValue(multiSelectActiveAtom);
  const selections = useAtomValue(multiSelectSelectionsAtom);
  const flashingId = useAtomValue(multiSelectFlashingIdAtom);
  const maxToastVisible = useAtomValue(multiSelectMaxToastVisibleAtom);
  const value = useMemo<MultiSelectStore>(
    () => ({ active, selections, flashingId, maxToastVisible }),
    [active, selections, flashingId, maxToastVisible],
  );
  return <MultiSelectStoreContext.Provider value={value}>{children}</MultiSelectStoreContext.Provider>;
}

export function useMultiSelectStore(): MultiSelectStore {
  return useContext(MultiSelectStoreContext);
}
