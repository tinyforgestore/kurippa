import cx from "classnames";
import {
  MultiSelectAction,
  useMultiSelectActionMenu,
} from "@/hooks/useMultiSelectActionMenu";
import { buttonHighlighted, container, hint, option, optionKey, title } from "./index.css";

interface MultiSelectActionMenuProps {
  count: number;
  onMerge: () => void;
  onPinAll: () => void;
  onMoveToFolder: () => void;
  onCancel: () => void;
}

const OPTIONS: { action: MultiSelectAction; key: string; label: string }[] = [
  { action: "merge", key: "M", label: "Merge and paste" },
  { action: "pin", key: "P", label: "Pin all" },
  { action: "folder", key: "F", label: "Move to folder" },
];

export function MultiSelectActionMenu({
  count,
  onMerge,
  onPinAll,
  onMoveToFolder,
  onCancel,
}: MultiSelectActionMenuProps) {
  const { selectedAction, setSelectedAction } = useMultiSelectActionMenu(
    onMerge,
    onPinAll,
    onMoveToFolder,
    onCancel,
  );

  const handlerFor = (action: MultiSelectAction) => {
    if (action === "merge") return onMerge;
    if (action === "pin") return onPinAll;
    return onMoveToFolder;
  };

  return (
    <div className={container}>
      <div className={title}>
        {count} item{count === 1 ? "" : "s"} selected
      </div>
      {OPTIONS.map(({ action, key, label }) => (
        <div
          key={action}
          className={cx(option, { [buttonHighlighted]: selectedAction === action })}
          onClick={handlerFor(action)}
          onMouseMove={() => setSelectedAction(action)}
        >
          <span className={optionKey}>{key}</span>
          {label}
        </div>
      ))}
      <div className={hint}>↑↓ to choose &middot; Enter to select &middot; Esc to cancel</div>
    </div>
  );
}
