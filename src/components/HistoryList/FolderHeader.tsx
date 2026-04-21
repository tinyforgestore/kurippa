import cx from "classnames";
import { Folder } from "lucide-react";
import {
  folderHeader,
  folderHeaderIcon,
  folderHeaderLabel,
  itemSelected,
  shortcutHint,
} from "@/components/HistoryList/index.css";

interface FolderHeaderProps {
  name: string;
  count: number;
  selected: boolean;
  hint: string | null;
  multiSelectActive?: boolean;
  onClick: () => void;
  onMouseMove: (e: React.MouseEvent) => void;
}

export function FolderHeader({ name, count, selected, hint, multiSelectActive, onClick, onMouseMove }: FolderHeaderProps) {
  return (
    <div
      className={cx(folderHeader, { [itemSelected]: selected })}
      data-folder-header
      onClick={onClick}
      onMouseMove={onMouseMove}
    >
      <Folder size={11} className={folderHeaderIcon} />
      <span className={folderHeaderLabel}>{name} ({count})</span>
      {hint !== null && !multiSelectActive && <span className={shortcutHint}>{hint}</span>}
    </div>
  );
}
