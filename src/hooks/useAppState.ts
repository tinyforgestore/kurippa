import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSetAtom } from "jotai";
import { useLocation } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { UPDATE_AVAILABLE } from "@/constants/events";
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
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { ClipboardItem } from "@/types";
import { TRIAL_ERROR } from "@/constants/errors";
import { updateInfoAtom, pasteAsPreviewTextAtom } from "@/atoms/ui";
import { selectedIndexAtom } from "@/atoms/navigation";
import { useClipboardStore, useNavigationStore, useUIStore } from "@/store";

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
  const location = useLocation();
  const nav = useAppNavigation();
  const resetSelectionRef = useRef<() => void>(() => {});

  const { updateInfo, pasteAsPreviewText } = useUIStore();
  const { query, selectedIndex, inPinnedSection, expandedFolderId } = useNavigationStore();
  const { visibleEntries } = useClipboardStore();
  const setUpdateInfo = useSetAtom(updateInfoAtom);
  const setPasteAsPreviewText = useSetAtom(pasteAsPreviewTextAtom);
  const setSelectedIndex = useSetAtom(selectedIndexAtom);

  const folderNameInputValueSetterRef = useRef<(v: string) => void>(() => {});
  const cancelClearConfirmRef = useRef<() => void>(() => {});

  const multiSelect = useMultiSelect();
  const defaultSeparator = useDefaultSeparator();

  const {
    loadFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    moveItemToFolder: _moveItemToFolder,
    removeItemFromFolder: _removeItemFromFolder,
  } = useFolders({ onTrialError });

  const inputActive = location.pathname === "/folder-name-input";

  const { setQuery, inputRef, dismiss, onDragStart } = useWindowDismiss(() => {
    resetSelectionRef.current();
    nav.toHistory();
    folderNameInputValueSetterRef.current("");
    cancelClearConfirmRef.current();
    multiSelect.exitMode();
  });

  const { deleteItem, togglePinItem, clearNonPinned, reloadHistory } = useClipboardHistory();

  const {
    enterPinnedSection,
    exitPinnedSection,
    enterFolderSection,
    exitFolderSection,
  } = useSectionNavigation();

  const { isOpen: isPreviewOpen, open: openPreview, close: closePreview } = usePreviewPanel();

  const clearConfirm = useClearConfirm({ clearNonPinned });

  const moveItemsToFolder = useCallback((ids: number[], folderId: number) => {
    invoke("move_items_to_folder", { ids, folderId })
      .then(() => {
        multiSelect.exitMode();
        reloadHistory();
        nav.toHistory();
      })
      .catch((err: string) => {
        if (err === TRIAL_ERROR) onTrialError?.("Folder organisation");
        else console.error(err);
      });
  }, [multiSelect, reloadHistory, nav, onTrialError]);

  const folderActions = useFolderActions({
    createFolder,
    renameFolder,
    deleteFolder,
    moveItemToFolder: _moveItemToFolder,
    moveItemsToFolder,
    removeItemFromFolder: _removeItemFromFolder,
    loadFolders,
    reloadHistory,
    onTrialError,
  });

  const onConvertPinnedToFolder = useCallback(() => {
    folderActions.setFolderNameInputValue("Pinned");
    nav.toFolderNameInput("convert-pinned", null, null);
  }, [folderActions, nav]);

  // eslint-disable-next-line react-hooks/refs
  folderNameInputValueSetterRef.current = folderActions.setFolderNameInputValue;
  // eslint-disable-next-line react-hooks/refs
  cancelClearConfirmRef.current = clearConfirm.onCancel;

  const { executePasteOption, onMergePaste } = usePasteActions({
    multiSelect,
    dismiss,
    onTrialError,
  });

  const selectedIndexRef = useRef(0);
  const pinAnimationRef = useRef<((id: number) => void) | null>(null);

  // Single source of truth for "is the current multi-selection made of image
  // items". Derived once here (from visibleEntries + the first selected id)
  // rather than in useAppKeyboard, and threaded into both useAppKeyboard (to
  // gate further Space-key selections) and the action-menu wiring below (to
  // pick "Combine images" vs "Merge and paste"). Empty selection -> false, so
  // the action menu still defaults to the merge row when nothing is selected.
  const isImageMultiSelect = useMemo(() => {
    if (multiSelect.selections.length === 0) return false;
    const firstEntry = visibleEntries.find(
      (ve) => ve.kind === "item" && ve.result.item.id === multiSelect.selections[0]
    );
    return firstEntry?.kind === "item" && firstEntry.result.item.kind === "image";
  }, [multiSelect.selections, visibleEntries]);

  useAppKeyboard({
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
    isImageMultiSelect,
  });

  useEffect(() => {
    window.addEventListener("focus", closePreview);
    return () => window.removeEventListener("focus", closePreview);
  }, [closePreview]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    listen<string>(UPDATE_AVAILABLE, (event) => {
      const version = event.payload;
      const dismissed = localStorage.getItem("dismissed_update_version");
      if (dismissed !== version) {
        setUpdateInfo({ version });
      }
    }).then((fn) => { unlisten = fn; }).catch(console.error);
    return () => { unlisten?.(); };
  }, [setUpdateInfo]);

  const installUpdate = useCallback(() => {
    invoke("install_update").catch(console.error);
  }, []);

  const dismissUpdate = useCallback(() => {
    if (updateInfo) {
      localStorage.setItem("dismissed_update_version", updateInfo.version);
    }
    setUpdateInfo(null);
  }, [updateInfo, setUpdateInfo]);

  const confirmPinnedDelete = useCallback(() => {
    invoke("delete_all_pinned_items")
      .then(() => { reloadHistory(); nav.toHistory(); })
      .catch(console.error);
  }, [nav, reloadHistory]);

  const unpinAllPinned = useCallback(() => {
    invoke("unpin_all_items")
      .then(() => { reloadHistory(); nav.toHistory(); })
      .catch(console.error);
  }, [nav, reloadHistory]);

  const onMultiMerge = useCallback(() => {
    nav.toSeparatorPicker();
  }, [nav]);

  const onMultiPinAll = useCallback(() => {
    invoke("pin_items", { ids: multiSelect.selections })
      .then(() => {
        multiSelect.exitMode();
        reloadHistory();
        nav.toHistory();
      })
      .catch(console.error);
  }, [multiSelect, reloadHistory, nav]);

  const onMultiMoveToFolder = useCallback(() => {
    nav.toFolderPickerMulti(multiSelect.selections);
  }, [nav, multiSelect]);

  const onMultiCombineImages = useCallback(() => {
    invoke("combine_and_paste_images", { itemIds: multiSelect.selections })
      .then(() => {
        multiSelect.exitMode();
        nav.toHistory();
        dismiss();
      })
      .catch((err: string) => {
        if (err === TRIAL_ERROR) {
          onTrialError?.("Image combine");
        } else {
          console.error(err);
        }
      });
  }, [multiSelect, nav, dismiss, onTrialError]);

  const { listRef, pasteSelected, deletingId } = useItemSelection(
    undefined,
    dismiss,
    undefined,
    {
      onPinToggle: (id: number) => pinAnimationRef.current?.(id),
      onDelete: deleteItem,
      inPinnedSection,
      onEnterSection: enterPinnedSection,
      onExitSection: exitPinnedSection,
      onEnterFolderSection: enterFolderSection,
      onExitFolderSection: exitFolderSection,
      expandedFolderId,
      onDeleteFolder: (id: number, name: string) => nav.toFolderDelete({ id, name }),
      onDeletePinned: (count: number) => nav.toPinnedDelete(count),
      onConvertPinnedToFolder,
      onOpenPreview: openPreview,
      onClosePreview: closePreview,
      onOpenPasteAs: (item: ClipboardItem) => nav.toPasteAs(item),
      enabled: location.pathname === "/" && !clearConfirm.show && !multiSelect.active,
      navigationEnabled: location.pathname === "/",
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
    onDragStart,
    visibleEntries,
    selectedIndex,
    setSelectedIndex,
    listRef,
    onClickItem,
    enterPinnedSection,
    liftingId,
    landingId,
    deletingId,
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
    onCancelSeparator: () => nav.toHistory(),
    folderNameInputValue: folderActions.folderNameInputValue,
    setFolderNameInputValue: folderActions.setFolderNameInputValue,
    confirmFolderNameInput: folderActions.confirmFolderNameInput,
    confirmFolderDelete: folderActions.confirmFolderDelete,
    confirmPinnedDelete,
    unpinAllPinned,
    onMultiMerge,
    onMultiPinAll,
    onMultiMoveToFolder,
    onMultiCombineImages,
    isImageMultiSelect,
    moveItemsToFolder,
    moveItemToFolder: folderActions.moveItemToFolder,
    removeItemFromFolder: folderActions.removeItemFromFolder,
    expandedFolderId,
    enterFolderSection,
    exitFolderSection,
    updateInfo,
    installUpdate,
    dismissUpdate,
  };
}
