import { useEffect, MutableRefObject } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ListEntry } from "@/types";
import { AppScreen } from "@/hooks/useAppState";

interface MultiSelectHandle {
  active: boolean;
  selections: number[];
  enterMode: (id: number) => void;
  exitMode: () => void;
  toggleSelection: (id: number, selectable: boolean) => void;
}

interface UseAppKeyboardParams {
  screen: AppScreen;
  setScreen: (s: AppScreen) => void;
  multiSelect: MultiSelectHandle;
  visibleEntries: ListEntry[];
  selectedIndexRef: MutableRefObject<number>;
  inputActive: boolean;
  expandedFolderId: number | null;
  exitFolderSection: () => void;
  setFolderNameInputValue: (v: string) => void;
  dismiss: () => void;
  isActivated: boolean;
  onTrialError?: (feature: string) => void;
}

export function useAppKeyboard({
  screen,
  setScreen,
  multiSelect,
  visibleEntries,
  selectedIndexRef,
  inputActive,
  expandedFolderId,
  exitFolderSection,
  setFolderNameInputValue,
  dismiss,
  isActivated,
  onTrialError,
}: UseAppKeyboardParams) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "," && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        invoke("open_settings_window").catch(console.error);
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "n" && !inputActive && screen.kind !== "pasteAs" && !multiSelect.active) {
        e.preventDefault();
        if (!isActivated) { onTrialError?.("Folder organisation"); return; }
        setFolderNameInputValue("");
        setScreen({ kind: "folderNameInput", mode: "create", targetId: null, pickerItemId: null });
        return;
      }

      if (e.key === "F2" && !inputActive) {
        const currentEntry = visibleEntries[selectedIndexRef.current];
        if (currentEntry?.kind === "folder-header") {
          e.preventDefault();
          setFolderNameInputValue(currentEntry.name);
          setScreen({ kind: "folderNameInput", mode: "rename", targetId: currentEntry.folderId, pickerItemId: null });
          return;
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f" && !inputActive) {
        const currentEntry = visibleEntries[selectedIndexRef.current];
        if (currentEntry?.kind === "item") {
          e.preventDefault();
          if (!isActivated) { onTrialError?.("Folder organisation"); return; }
          setScreen({ kind: "folderPicker", itemId: currentEntry.result.item.id });
          return;
        }
      }

      if (e.key === "Escape" && !inputActive) {
        if (expandedFolderId !== null) {
          e.preventDefault();
          exitFolderSection();
          return;
        }
        if (screen.kind === "folderDelete" || screen.kind === "folderPicker") {
          e.preventDefault();
          setScreen({ kind: "history" });
          return;
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "m") {
        e.preventDefault();
        if (multiSelect.active) {
          multiSelect.exitMode();
          setScreen({ kind: "history" });
        } else {
          if (!isActivated) { onTrialError?.("Multi-paste"); return; }
          const currentEntry = visibleEntries[selectedIndexRef.current];
          if (currentEntry && currentEntry.kind === "item") {
            multiSelect.enterMode(currentEntry.result.item.id);
          }
        }
        return;
      }

      if (e.key === " " && multiSelect.active && screen.kind !== "separatorPicker") {
        e.preventDefault();
        const currentEntry = visibleEntries[selectedIndexRef.current];
        if (currentEntry && currentEntry.kind === "item") {
          const isSelectable = currentEntry.result.item.kind !== "image";
          multiSelect.toggleSelection(currentEntry.result.item.id, isSelectable);
        }
        return;
      }

      if (e.key === "Enter" && multiSelect.active && screen.kind !== "separatorPicker") {
        e.preventDefault();
        if (multiSelect.selections.length === 1) {
          const itemId = multiSelect.selections[0];
          const entry = visibleEntries.find(
            (ve) => ve.kind === "item" && ve.result.item.id === itemId
          );
          if (entry && entry.kind === "item") {
            const item = entry.result.item;
            const text = item.text ?? "";
            invoke("paste_item", { text, plainText: false, itemId: item.id }).catch(console.error);
            multiSelect.exitMode();
            dismiss();
          }
        } else if (multiSelect.selections.length >= 2) {
          setScreen({ kind: "separatorPicker" });
        }
        return;
      }

      if (e.key === "Escape" && multiSelect.active && screen.kind !== "separatorPicker") {
        e.preventDefault();
        multiSelect.exitMode();
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [screen, setScreen, multiSelect, visibleEntries, selectedIndexRef, inputActive, expandedFolderId, exitFolderSection, setFolderNameInputValue, dismiss, isActivated, onTrialError]);
}
