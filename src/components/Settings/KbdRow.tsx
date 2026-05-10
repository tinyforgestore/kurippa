import { kbdRow, kbdAction, kbdKeys, kbd } from "./index.css";

export function KbdRow({ action, keys }: { action: string; keys: readonly string[] }) {
  return (
    <div className={kbdRow}>
      <span className={kbdAction}>{action}</span>
      <div className={kbdKeys}>
        {keys.map((k, i) => (
          <kbd key={i} className={kbd}>
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
}
