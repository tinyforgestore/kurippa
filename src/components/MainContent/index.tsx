import { RefObject } from "react";
import { Folder, ListEntry } from "@/types";
import { AppScreen } from "@/hooks/useAppState";
import { PasteOption } from "@/utils/pasteAs";
import { PasteAsMenu } from "@/components/PasteAsMenu";
import { SeparatorPicker } from "@/components/SeparatorPicker";
import { FolderNameInput } from "@/components/FolderNameInput";
import { FolderDeleteConfirm } from "@/components/FolderDeleteConfirm";
import { FolderPicker } from "@/components/FolderPicker";
import { HistoryList } from "@/components/HistoryList";

interface MainContentProps {
  screen: AppScreen;
  setScreen: (s: AppScreen) => void;
  executePasteOption: (opt: PasteOption) => void;
  setPasteAsPreviewText: (text: string | null) => void;
  openPreview: () => void;
  defaultSeparator: "newline" | "space" | "comma";
  onMergePaste: (sep: string) => void;
  folderNameInputValue: string;
  setFolderNameInputValue: (v: string) => void;
  confirmFolderNameInput: () => void;
  confirmFolderDelete: (del: boolean) => void;
  folders: Folder[];
  visibleEntries: ListEntry[];
  moveItemToFolder: (itemId: number, folderId: number) => Promise<void>;
  removeItemFromFolder: (itemId: number) => Promise<void>;
  selectedIndex: number;
  setSelectedIndex: (i: number) => void;
  listRef: RefObject<HTMLDivElement | null>;
  onClickItem: () => void;
  enterPinnedSection: () => void;
  enterFolderSection: (folderId: number) => void;
  expandedFolderId: number | null;
  liftingId: number | null;
  landingId: number | null;
  deletingId: number | null;
  multiSelectActive: boolean;
  selections: number[];
  flashingId: number | null;
}

export function MainContent({
  screen,
  setScreen,
  executePasteOption,
  setPasteAsPreviewText,
  openPreview,
  defaultSeparator,
  onMergePaste,
  folderNameInputValue,
  setFolderNameInputValue,
  confirmFolderNameInput,
  confirmFolderDelete,
  folders,
  visibleEntries,
  moveItemToFolder,
  removeItemFromFolder,
  selectedIndex,
  setSelectedIndex,
  listRef,
  onClickItem,
  enterPinnedSection,
  enterFolderSection,
  expandedFolderId,
  liftingId,
  landingId,
  deletingId,
  multiSelectActive,
  selections,
  flashingId,
}: MainContentProps) {
  switch (screen.kind) {
    case "pasteAs":
      return (
        <PasteAsMenu
          item={screen.item}
          onClose={() => setScreen({ kind: "history" })}
          onSelect={executePasteOption}
          onCursorChange={setPasteAsPreviewText}
          onOpenPreview={openPreview}
        />
      );

    case "separatorPicker":
      return (
        <SeparatorPicker
          onConfirm={onMergePaste}
          onCancel={() => setScreen({ kind: "history" })}
          defaultSeparator={defaultSeparator}
        />
      );

    case "folderNameInput":
      return (
        <FolderNameInput
          value={folderNameInputValue}
          onChange={setFolderNameInputValue}
          onConfirm={confirmFolderNameInput}
          onCancel={() => setScreen({ kind: "history" })}
          placeholder={screen.mode === "create" ? "New folder name" : "Rename folder"}
        />
      );

    case "folderDelete":
      return (
        <FolderDeleteConfirm
          folderName={screen.target.name}
          onConfirm={() => confirmFolderDelete(true)}
          onCancel={() => setScreen({ kind: "history" })}
        />
      );

    case "folderPicker": {
      const pickerEntry = visibleEntries.find(
        (e) => e.kind === "item" && e.result.item.id === screen.itemId
      );
      const currentFolderId =
        pickerEntry?.kind === "item" ? (pickerEntry.result.item.folder_id ?? null) : null;
      return (
        <FolderPicker
          folders={folders}
          currentFolderId={currentFolderId}
          onSelectFolder={(folderId) => {
            moveItemToFolder(screen.itemId, folderId);
            setScreen({ kind: "history" });
          }}
          onRemoveFromFolder={() => {
            removeItemFromFolder(screen.itemId);
            setScreen({ kind: "history" });
          }}
          onCreateNewFolder={() => {
            setFolderNameInputValue("");
            setScreen({
              kind: "folderNameInput",
              mode: "create",
              targetId: null,
              pickerItemId: screen.itemId,
            });
          }}
          onCancel={() => setScreen({ kind: "history" })}
        />
      );
    }

    case "history":
    default:
      return (
        <HistoryList
          visibleEntries={visibleEntries}
          selectedIndex={selectedIndex}
          listRef={listRef}
          onHoverItem={setSelectedIndex}
          onClickItem={onClickItem}
          onEnterSection={enterPinnedSection}
          onEnterFolderSection={enterFolderSection}
          expandedFolderId={expandedFolderId}
          liftingId={liftingId}
          landingId={landingId}
          deletingId={deletingId}
          multiSelectActive={multiSelectActive}
          selections={selections}
          flashingId={flashingId}
        />
      );
  }
}
