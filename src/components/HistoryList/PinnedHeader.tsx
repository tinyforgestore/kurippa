import cx from "classnames";
import { Pin } from "lucide-react";
import {
  itemSelected,
  pinnedHeader,
  pinnedHeaderIcon,
  pinnedHeaderLabel,
  shortcutHint,
} from "@/components/HistoryList/index.css";

interface PinnedHeaderProps {
  count: number;
  selected: boolean;
  hint: string | null;
  multiSelectActive?: boolean;
  onClick: () => void;
  onMouseMove: (e: React.MouseEvent) => void;
}

export function PinnedHeader({ count, selected, hint, multiSelectActive, onClick, onMouseMove }: PinnedHeaderProps) {
  return (
    <div
      className={cx(pinnedHeader, { [itemSelected]: selected })}
      data-pinned-header
      onClick={onClick}
      onMouseMove={onMouseMove}
    >
      <Pin size={11} className={pinnedHeaderIcon} />
      <span className={pinnedHeaderLabel}>Pinned ({count})</span>
      {hint !== null && !multiSelectActive && <span className={shortcutHint}>{hint}</span>}
    </div>
  );
}
