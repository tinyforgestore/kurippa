import { KbdRow } from "./KbdRow";
import { sectionTitle, rowLabel, divider, kbdSection } from "./index.css";

export function HotkeysTab() {
  return (
    <>
      <div className={sectionTitle}>Hotkeys</div>
      <div className={kbdSection}>
        <div className={rowLabel} style={{ marginBottom: 10 }}>
          Global
        </div>
        <KbdRow action="Open Kurippa" keys={["⌘", "⇧", "V"]} />
      </div>
      <div className={divider} />
      <div className={kbdSection}>
        <div className={rowLabel} style={{ marginBottom: 10 }}>
          In-popup actions
        </div>
        <KbdRow action="Pin / unpin item" keys={["⌘", "P"]} />
        <KbdRow action="Delete item" keys={["⌘", "⌫"]} />
        <KbdRow action="Open preview" keys={["→"]} />
        <KbdRow action="Paste as..." keys={["⇧", "↵"]} />
        <KbdRow action="Quick paste 0–9" keys={["⌘", "0–9"]} />
        <KbdRow action="Settings" keys={["⌘", ","]} />
        <KbdRow action="Dismiss" keys={["Esc"]} />
      </div>
    </>
  );
}
