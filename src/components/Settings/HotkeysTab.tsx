import { KbdRow } from "./KbdRow";
import { sectionTitle, rowLabel, divider, kbdSection } from "./index.css";
import {
  MOD_KEY,
  SHIFT_KEY,
  BACKSPACE_KEY,
  ENTER_KEY,
} from "@/utils/platformKeys";
import { GLOBAL_HOTKEY_KEYS } from "@/utils/globalShortcut";

export function HotkeysTab() {
  return (
    <>
      <div className={sectionTitle}>Hotkeys</div>
      <div className={kbdSection}>
        <div className={rowLabel} style={{ marginBottom: 10 }}>
          Global
        </div>
        <KbdRow action="Open Kurippa" keys={GLOBAL_HOTKEY_KEYS} />
      </div>
      <div className={divider} />
      <div className={kbdSection}>
        <div className={rowLabel} style={{ marginBottom: 10 }}>
          In-popup actions
        </div>
        <KbdRow action="Pin / unpin item" keys={[MOD_KEY, "P"]} />
        <KbdRow action="Delete item" keys={[MOD_KEY, BACKSPACE_KEY]} />
        <KbdRow action="Open preview" keys={["→"]} />
        <KbdRow action="Paste as..." keys={[SHIFT_KEY, ENTER_KEY]} />
        <KbdRow action="Quick paste 0–9" keys={[MOD_KEY, "0–9"]} />
        <KbdRow action="Settings" keys={[MOD_KEY, ","]} />
        <KbdRow action="Dismiss" keys={["Esc"]} />
      </div>
    </>
  );
}
