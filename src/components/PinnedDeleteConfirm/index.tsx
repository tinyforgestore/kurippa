import cx from "classnames";
import { usePinnedDeleteConfirm } from "@/hooks/usePinnedDeleteConfirm";
import {
  body,
  buttonHighlighted,
  confirmButton,
  container,
  hint,
  title,
  unpinButton,
} from "./index.css";

interface PinnedDeleteConfirmProps {
  count: number;
  onConfirm: () => void;
  onUnpinAll: () => void;
  onCancel: () => void;
}

export function PinnedDeleteConfirm({ count, onConfirm, onUnpinAll, onCancel }: PinnedDeleteConfirmProps) {
  const { highlightedAction, setHighlightedAction } = usePinnedDeleteConfirm(onConfirm, onUnpinAll, onCancel);

  return (
    <div className={container}>
      <div className={title}>Delete all pinned items?</div>
      <div className={body}>
        This will delete all {count} pinned items. This cannot be undone.
      </div>
      <div
        className={cx(confirmButton, { [buttonHighlighted]: highlightedAction === "delete" })}
        onClick={onConfirm}
        onMouseMove={() => setHighlightedAction("delete")}
      >
        Yes, delete
      </div>
      <div
        className={cx(unpinButton, { [buttonHighlighted]: highlightedAction === "unpin" })}
        onClick={onUnpinAll}
        onMouseMove={() => setHighlightedAction("unpin")}
      >
        Unpin all instead
      </div>
      <div className={hint}>↑↓ to choose &middot; Enter to confirm &middot; Esc to cancel</div>
    </div>
  );
}
