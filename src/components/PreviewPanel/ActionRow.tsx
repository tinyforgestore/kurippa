import { actionRow, actionHint, kbdChip } from "./index.css";
import { MOD_KEY, BACKSPACE_KEY } from "@/utils/platformKeys";

export function ActionRow() {
  return (
    <div className={actionRow}>
      <span className={actionHint}>
        <kbd className={kbdChip}>{MOD_KEY}</kbd><kbd className={kbdChip}>{BACKSPACE_KEY}</kbd>{" delete"}
      </span>
      <span className={actionHint}>
        <kbd className={kbdChip}>{MOD_KEY}</kbd><kbd className={kbdChip}>P</kbd>{" pin"}
      </span>
    </div>
  );
}
