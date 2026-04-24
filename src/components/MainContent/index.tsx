import { RefObject } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Folder, ListEntry } from "@/types";
import { PasteOption } from "@/utils/pasteAs";
import { PasteAsMenu } from "@/components/PasteAsMenu";
import { SeparatorPicker } from "@/components/SeparatorPicker";
import { FolderNameInput } from "@/components/FolderNameInput";
import { FolderDeleteConfirm } from "@/components/FolderDeleteConfirm";
import { FolderPicker } from "@/components/FolderPicker";
import { HistoryList } from "@/components/HistoryList";

interface MainContentProps {
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
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Routes>
      <Route
        path="/paste-as"
        element={
          <PasteAsMenu
            item={(location.state as { item: ReturnType<typeof Object> } | null)?.item}
            onClose={() => navigate("/")}
            onSelect={executePasteOption}
            onCursorChange={setPasteAsPreviewText}
            onOpenPreview={openPreview}
          />
        }
      />
      <Route
        path="/separator-picker"
        element={
          <SeparatorPicker
            onConfirm={onMergePaste}
            onCancel={() => navigate("/")}
            defaultSeparator={defaultSeparator}
          />
        }
      />
      <Route
        path="/folder-name-input"
        element={
          <FolderNameInput
            value={folderNameInputValue}
            onChange={setFolderNameInputValue}
            onConfirm={confirmFolderNameInput}
            onCancel={() => navigate("/")}
            placeholder={
              (location.state as { mode?: string } | null)?.mode === "create"
                ? "New folder name"
                : "Rename folder"
            }
          />
        }
      />
      <Route
        path="/folder-delete"
        element={
          <FolderDeleteConfirm
            folderName={(location.state as { target: { id: number; name: string } } | null)?.target?.name ?? ""}
            onConfirm={() => confirmFolderDelete(true)}
            onCancel={() => navigate("/")}
          />
        }
      />
      <Route
        path="/folder-picker"
        element={(() => {
          const itemId = (location.state as { itemId: number } | null)?.itemId ?? 0;
          const pickerEntry = visibleEntries.find(
            (e) => e.kind === "item" && e.result.item.id === itemId
          );
          const currentFolderId =
            pickerEntry?.kind === "item" ? (pickerEntry.result.item.folder_id ?? null) : null;
          return (
            <FolderPicker
              folders={folders}
              currentFolderId={currentFolderId}
              onSelectFolder={(folderId) => {
                moveItemToFolder(itemId, folderId);
                navigate("/");
              }}
              onRemoveFromFolder={() => {
                removeItemFromFolder(itemId);
                navigate("/");
              }}
              onCreateNewFolder={() => {
                setFolderNameInputValue("");
                navigate("/folder-name-input", {
                  state: { mode: "create", targetId: null, pickerItemId: itemId },
                });
              }}
              onCancel={() => navigate("/")}
            />
          );
        })()}
      />
      <Route
        path="*"
        element={
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
        }
      />
    </Routes>
  );
}
