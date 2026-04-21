import type { AppSettings } from "@/types/settings";
import { Toggle } from "./Toggle";
import { sectionTitle, toggleRow, toggleLabel, toggleSub, row, rowLabel, appList, appItem, appRemove, addBtn, rowDesc } from "./index.css";

interface PrivacyTabProps {
  s: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  addIgnoredApp: () => void;
  removeIgnoredApp: (bundleId: string) => void;
}

export function PrivacyTab({ s, updateSettings, addIgnoredApp, removeIgnoredApp }: PrivacyTabProps) {
  return (
    <>
      <div className={sectionTitle}>Privacy</div>
      <div className={toggleRow}>
        <div>
          <div className={toggleLabel}>Auto-clear password manager items</div>
          <div className={toggleSub}>Clear sensitive copies after 30 seconds</div>
        </div>
        <Toggle
          checked={s.auto_clear_passwords}
          onChange={(v) => updateSettings({ auto_clear_passwords: v })}
        />
      </div>
      <div className={row}>
        <div className={rowLabel}>Ignored apps</div>
        {s.ignored_apps.length > 0 && (
          <div className={appList}>
            {s.ignored_apps.map((app) => (
              <div key={app.bundle_id} className={appItem}>
                <span>{app.display_name}</span>
                <button
                  className={appRemove}
                  title="Remove"
                  onClick={() => removeIgnoredApp(app.bundle_id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <button className={addBtn} onClick={addIgnoredApp}>
          + Add app
        </button>
        <div className={rowDesc}>
          Copies made while these apps are focused are not captured
        </div>
      </div>
    </>
  );
}
