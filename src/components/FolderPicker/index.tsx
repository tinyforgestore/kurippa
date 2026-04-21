import cx from "classnames";
import { Folder } from "@/types";
import { useFolderPicker } from "@/hooks/useFolderPicker";
import {
  container,
  folderOption,
  folderOptionActive,
  folderOptionCount,
  folderOptionFocused,
  folderOptionKey,
  folderOptionLabel,
  hint,
  newFolderOption,
  newFolderOptionFocused,
  pickerTitle,
} from "./index.css";

interface FolderPickerProps {
  folders: Folder[];
  currentFolderId: number | null;
  onSelectFolder: (folderId: number) => void;
  onRemoveFromFolder: () => void;
  onCreateNewFolder: () => void;
  onCancel: () => void;
}

export function FolderPicker({
  folders,
  currentFolderId,
  onSelectFolder,
  onRemoveFromFolder,
  onCreateNewFolder,
  onCancel,
}: FolderPickerProps) {
  const newFolderIndex = folders.length;
  const { cursorIndex, setCursorIndex, activate } = useFolderPicker({
    folders,
    currentFolderId,
    onSelectFolder,
    onRemoveFromFolder,
    onCreateNewFolder,
    onCancel,
  });

  return (
    <div className={container}>
      <div className={pickerTitle}>Move to folder&hellip;</div>
      {folders.map((folder, i) => {
        const isCurrent = folder.id === currentFolderId;
        return (
          <div
            key={folder.id}
            className={cx(folderOption, {
              [folderOptionActive]: isCurrent,
              [folderOptionFocused]: cursorIndex === i,
            })}
            onMouseEnter={() => setCursorIndex(i)}
            onClick={() => activate(i)}
          >
            <span className={folderOptionKey}>{i + 1}</span>
            <span className={folderOptionLabel}>{folder.name}</span>
            <span className={folderOptionCount}>({folder.id})</span>
          </div>
        );
      })}
      <div
        className={cx(newFolderOption, { [newFolderOptionFocused]: cursorIndex === newFolderIndex })}
        onMouseEnter={() => setCursorIndex(newFolderIndex)}
        onClick={onCreateNewFolder}
      >
        <span>+</span>
        <span>New folder&hellip;</span>
      </div>
      <div className={hint}>Tab / ↑↓ to navigate &middot; Enter to select &middot; Esc to cancel</div>
    </div>
  );
}
