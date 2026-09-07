import cx from "classnames";
import {
  MultiSelectAction,
  useMultiSelectActionMenu,
} from "@/hooks/useMultiSelectActionMenu";
import { buttonHighlighted, container, hint, option, optionKey, title } from "./index.css";

interface MultiSelectActionMenuProps {
  count: number;
  onMerge: () => void;
  onCombine: () => void;
  onPinAll: () => void;
  onMoveToFolder: () => void;
  onCancel: () => void;
  isImageSelection: boolean;
}

// Row 1's action id stays "merge" regardless of selection kind — it's an
// internal key used only for keyboard nav/highlight state (also shared with
// useMultiSelectActionMenu's ACTIONS list), not user-facing. Only the label
// and the handler slotted into it change based on isImageSelection.
function optionsFor(isImageSelection: boolean): { action: MultiSelectAction; key: string; label: string }[] {
  return [
    {
      action: "merge",
      key: "M",
      label: isImageSelection ? "Combine images" : "Merge and paste",
    },
    { action: "pin", key: "P", label: "Pin all" },
    { action: "folder", key: "F", label: "Move to folder" },
  ];
}

export function MultiSelectActionMenu({
  count,
  onMerge,
  onCombine,
  onPinAll,
  onMoveToFolder,
  onCancel,
  isImageSelection,
}: MultiSelectActionMenuProps) {
  const onMergeOrCombine = isImageSelection ? onCombine : onMerge;

  const { selectedAction, setSelectedAction } = useMultiSelectActionMenu(
    onMergeOrCombine,
    onPinAll,
    onMoveToFolder,
    onCancel,
  );

  const handlerFor = (action: MultiSelectAction) => {
    if (action === "merge") return onMergeOrCombine;
    if (action === "pin") return onPinAll;
    return onMoveToFolder;
  };

  return (
    <div className={container}>
      <div className={title}>
        {count} item{count === 1 ? "" : "s"} selected
      </div>
      {optionsFor(isImageSelection).map(({ action, key, label }) => (
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
