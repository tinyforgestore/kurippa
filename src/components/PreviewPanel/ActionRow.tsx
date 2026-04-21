import { actionRow, actionHint, kbdChip } from "./index.css";

export function ActionRow() {
  return (
    <div className={actionRow}>
      <span className={actionHint}>
        <kbd className={kbdChip}>⌘</kbd><kbd className={kbdChip}>⌫</kbd>{" delete"}
      </span>
      <span className={actionHint}>
        <kbd className={kbdChip}>⌘</kbd><kbd className={kbdChip}>P</kbd>{" pin"}
      </span>
    </div>
  );
}
