import { type ReactNode } from "react";
import { ClipboardStoreProvider } from "@/store/clipboard";
import { FoldersStoreProvider } from "@/store/folders";
import { NavigationStoreProvider } from "@/store/navigation";
import { MultiSelectStoreProvider } from "@/store/multiSelect";
import { UIStoreProvider } from "@/store/ui";
import { SettingsStoreProvider } from "@/store/settings";

export { useClipboardStore } from "@/store/clipboard";
export { useFoldersStore } from "@/store/folders";
export { useNavigationStore } from "@/store/navigation";
export { useMultiSelectStore } from "@/store/multiSelect";
export { useUIStore } from "@/store/ui";
export { useSettingsStore } from "@/store/settings";

export type { ClipboardStore } from "@/store/clipboard";
export type { FoldersStore } from "@/store/folders";
export type { NavigationStore } from "@/store/navigation";
export type { MultiSelectStore } from "@/store/multiSelect";
export type { UIStore } from "@/store/ui";
export type { SettingsStore } from "@/store/settings";

export { ClipboardStoreContext } from "@/store/clipboard";
export { FoldersStoreContext } from "@/store/folders";
export { NavigationStoreContext } from "@/store/navigation";
export { MultiSelectStoreContext } from "@/store/multiSelect";
export { UIStoreContext } from "@/store/ui";
export { SettingsStoreContext } from "@/store/settings";

export function StoreProvider({ children }: { children: ReactNode }) {
  return (
    <ClipboardStoreProvider>
      <FoldersStoreProvider>
        <NavigationStoreProvider>
          <MultiSelectStoreProvider>
            <UIStoreProvider>
              <SettingsStoreProvider>{children}</SettingsStoreProvider>
            </UIStoreProvider>
          </MultiSelectStoreProvider>
        </NavigationStoreProvider>
      </FoldersStoreProvider>
    </ClipboardStoreProvider>
  );
}
