import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useClipboardHistory } from "@/hooks/useClipboardHistory";
import { useWindowDismiss } from "@/hooks/useWindowDismiss";
import { useItemSelection } from "@/hooks/useItemSelection";
import { useSectionNavigation } from "@/hooks/useSectionNavigation";
import { useFolders } from "@/hooks/useFolders";
import { usePinAnimation } from "@/hooks/usePinAnimation";
import { usePreviewPanel } from "@/hooks/usePreviewPanel";
import { useMultiSelect } from "@/hooks/useMultiSelect";
import { useDefaultSeparator } from "@/hooks/useDefaultSeparator";
import { useClearConfirm } from "@/hooks/useClearConfirm";
import { useFolderActions } from "@/hooks/useFolderActions";
import { usePasteActions } from "@/hooks/usePasteActions";
import { useAppKeyboard } from "@/hooks/useAppKeyboard";
import { ClipboardItem } from "@/types";

export type AppScreen =
  | { kind: "history" }
  | { kind: "pasteAs"; item: ClipboardItem }
  | { kind: "separatorPicker" }
  | { kind: "folderNameInput"; mode: "create" | "rename"; targetId: number | null; pickerItemId: number | null }
  | { kind: "folderDelete"; target: { id: number; name: string } }
  | { kind: "folderPicker"; itemId: number };

interface UseAppStateParams {
  onTrialError?: (feature: string) => void;
  isActivated?: boolean;
}

export function useAppState({ onTrialError, isActivated = false }: UseAppStateParams = {}) {
  const resetSelectionRef = useRef<() => void>(() => {});
  const [pasteAsPreviewText, setPasteAsPreviewText] = useState<string | null>(null);
  const [screen, setScreen] = useState<AppScreen>({ kind: "history" });
  const [updateInfo, setUpdateInfo] = useState<{ version: string } | null>(null);

  const folderNameInputValueSetterRef = useRef<(v: string) => void>(() => {});
  const cancelClearConfirmRef = useRef<() => void>(() => {});

  const multiSelect = useMultiSelect();
  const defaultSeparator = useDefaultSeparator();

  const {
    folders,
    loadFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    moveItemToFolder: _moveItemToFolder,
    removeItemFromFolder: _removeItemFromFolder,
    maxFoldersToast,
  } = useFolders({ onTrialError });

  const inputActive = screen.kind === "folderNameInput";

  const { query, setQuery, inputRef, dismiss } = useWindowDismiss(() => {
    resetSelectionRef.current();
    setScreen({ kind: "history" });
    folderNameInputValueSetterRef.current("");
    cancelClearConfirmRef.current();
    multiSelect.exitMode();
  });

  const { results, deleteItem, togglePinItem, clearNonPinned, reloadHistory } = useClipboardHistory(query, folders);

  const {
    visibleEntries,
    inPinnedSection,
    expandedFolderId,
    enterPinnedSection,
    exitPinnedSection,
    enterFolderSection,
    exitFolderSection,
  } = useSectionNavigation(results, folders, query);

  const { isOpen: isPreviewOpen, open: openPreview, close: closePreview } = usePreviewPanel();

  const clearConfirm = useClearConfirm({ clearNonPinned });

  const folderActions = useFolderActions({
    screen,
    setScreen,
    createFolder,
    renameFolder,
    deleteFolder,
    moveItemToFolder: _moveItemToFolder,
    removeItemFromFolder: _removeItemFromFolder,
    loadFolders,
    reloadHistory,
  });

  // eslint-disable-next-line react-hooks/refs
  folderNameInputValueSetterRef.current = folderActions.setFolderNameInputValue;
  // eslint-disable-next-line react-hooks/refs
  cancelClearConfirmRef.current = clearConfirm.onCancel;

  const { executePasteOption, onMergePaste } = usePasteActions({
    setScreen,
    multiSelect,
    dismiss,
    onTrialError,
  });

  const selectedIndexRef = useRef(0);
  const pinAnimationRef = useRef<((id: number) => void) | null>(null);

  useAppKeyboard({
    screen,
    setScreen,
    multiSelect,
    visibleEntries,
    selectedIndexRef,
    inputActive,
    expandedFolderId,
    exitFolderSection,
    setFolderNameInputValue: folderActions.setFolderNameInputValue,
    dismiss,
    isActivated,
    onTrialError,
  });

  useEffect(() => {
    window.addEventListener("focus", closePreview);
    return () => window.removeEventListener("focus", closePreview);
  }, [closePreview]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    listen<string>("update-available", (event) => {
      const version = event.payload;
      const dismissed = localStorage.getItem("dismissed_update_version");
      if (dismissed !== version) {
        setUpdateInfo({ version });
      }
    }).then((fn) => { unlisten = fn; }).catch(console.error);
    return () => { unlisten?.(); };
  }, []);

  const installUpdate = useCallback(() => {
    invoke("install_update").catch(console.error);
  }, []);

  const dismissUpdate = useCallback(() => {
    if (updateInfo) {
      localStorage.setItem("dismissed_update_version", updateInfo.version);
    }
    setUpdateInfo(null);
  }, [updateInfo]);

  const { selectedIndex, setSelectedIndex, listRef, pasteSelected, deletingId } = useItemSelection(
    visibleEntries,
    dismiss,
    query,
    {
      onPinToggle: (id: number) => pinAnimationRef.current?.(id),
      onDelete: deleteItem,
      inPinnedSection,
      onEnterSection: enterPinnedSection,
      onExitSection: exitPinnedSection,
      onEnterFolderSection: enterFolderSection,
      onExitFolderSection: exitFolderSection,
      expandedFolderId,
      onDeleteFolder: (id: number, name: string) => setScreen({ kind: "folderDelete", target: { id, name } }),
      onOpenPreview: openPreview,
      onClosePreview: closePreview,
      onOpenPasteAs: (item: ClipboardItem) => setScreen({ kind: "pasteAs", item }),
      enabled: screen.kind === "history" && !clearConfirm.show && !multiSelect.active,
      navigationEnabled: screen.kind === "history",
    }
  );

  // eslint-disable-next-line react-hooks/refs
  selectedIndexRef.current = selectedIndex;
  // eslint-disable-next-line react-hooks/refs
  resetSelectionRef.current = () => setSelectedIndex(0);

  const { liftingId, landingId, handleTogglePin } = usePinAnimation(togglePinItem, listRef);
  // eslint-disable-next-line react-hooks/refs
  pinAnimationRef.current = handleTogglePin;

  const onClickItem = useCallback(() => pasteSelected(false), [pasteSelected]);

  const selectedEntry = visibleEntries[selectedIndex];
  const selectedItem: ClipboardItem | null =
    selectedEntry?.kind === "item" ? selectedEntry.result.item : null;

  return {
    query,
    setQuery,
    inputRef,
    dismiss,
    visibleEntries,
    selectedIndex,
    setSelectedIndex,
    listRef,
    onClickItem,
    enterPinnedSection,
    liftingId,
    landingId,
    deletingId,
    screen,
    setScreen,
    executePasteOption,
    setPasteAsPreviewText,
    openPreview,
    isPreviewOpen,
    selectedItem,
    pasteAsPreviewText,
    clearConfirm,
    multiSelect,
    defaultSeparator,
    onMergePaste,
    onCancelSeparator: () => setScreen({ kind: "history" }),
    folders,
    folderNameInputValue: folderActions.folderNameInputValue,
    setFolderNameInputValue: folderActions.setFolderNameInputValue,
    confirmFolderNameInput: folderActions.confirmFolderNameInput,
    confirmFolderDelete: folderActions.confirmFolderDelete,
    moveItemToFolder: folderActions.moveItemToFolder,
    removeItemFromFolder: folderActions.removeItemFromFolder,
    expandedFolderId,
    enterFolderSection,
    exitFolderSection,
    maxFoldersToast,
    updateInfo,
    installUpdate,
    dismissUpdate,
  };
}
