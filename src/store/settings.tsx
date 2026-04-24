import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { defaultSeparatorAtom } from "@/atoms/settings";

export interface SettingsStore {
  defaultSeparator: "newline" | "space" | "comma";
}

const defaultSettingsStore: SettingsStore = {
  defaultSeparator: "newline",
};

export const SettingsStoreContext = createContext<SettingsStore>(defaultSettingsStore);

export function SettingsStoreProvider({ children }: { children: ReactNode }) {
  const defaultSeparator = useAtomValue(defaultSeparatorAtom);
  const value = useMemo<SettingsStore>(() => ({ defaultSeparator }), [defaultSeparator]);
  return <SettingsStoreContext.Provider value={value}>{children}</SettingsStoreContext.Provider>;
}

export function useSettingsStore(): SettingsStore {
  return useContext(SettingsStoreContext);
}
