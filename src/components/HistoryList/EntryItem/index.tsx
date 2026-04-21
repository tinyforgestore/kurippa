import cx from "classnames";
import { Pin } from "lucide-react";
import { FuzzyResult } from "@/types";
import { itemSelected, shortcutHint, folderItemAccent } from "@/components/HistoryList/index.css";
import {
  item,
  itemScaled,
  itemLanding,
  itemLifting,
  itemDeleting,
  itemDimmed,
  badgeOverlay,
  flashPulse,
  pinIcon,
  qrBadge,
} from "@/components/HistoryList/EntryItem/index.css";
import { ItemContent } from "@/components/HistoryList/EntryItem/ItemContent";

interface EntryItemProps {
  result: FuzzyResult;
  selected: boolean;
  hint: string | null;
  lifting: boolean;
  landing: boolean;
  deleting: boolean;
  onMove: (e: React.MouseEvent) => void;
  onClick: () => void;
  multiSelectActive?: boolean;
  selectionBadge?: number | null;
  isFlashing?: boolean;
  isSelectable?: boolean;
  inFolderView?: boolean;
}

export function EntryItem({
  result,
  selected,
  hint,
  lifting,
  landing,
  deleting,
  onMove,
  onClick,
  multiSelectActive,
  selectionBadge,
  isFlashing,
  isSelectable,
  inFolderView,
}: EntryItemProps) {
  const dimmed = multiSelectActive && isSelectable === false;

  return (
    <div
      className={cx(item, {
        [itemScaled]: selected,
        [itemSelected]: selected,
        [itemLifting]: lifting,
        [itemLanding]: landing,
        [itemDeleting]: deleting,
        [itemDimmed]: dimmed,
        [flashPulse]: isFlashing,
        [folderItemAccent]: inFolderView,
      })}
      data-item
      data-selected={selected || undefined}
      onMouseMove={onMove}
      onClick={onClick}
    >
      <ItemContent result={result} />
      {result.item.pinned && <Pin size={10} className={pinIcon} />}
      {result.item.qr_text != null && <span className={qrBadge}>QR</span>}
      {hint !== null && !selectionBadge && !multiSelectActive && <span className={shortcutHint}>{hint}</span>}
      {selectionBadge != null && (
        <span className={badgeOverlay} aria-label={`Selection ${selectionBadge}`}>
          {selectionBadge}
        </span>
      )}
    </div>
  );
}
