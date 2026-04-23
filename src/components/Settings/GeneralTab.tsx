import type { AppSettings, HistoryLimit, AutoClearAfter, MultiPasteSeparator } from "@/types/settings";
import type { Theme } from "@/hooks/useTheme";
import { Toggle } from "./Toggle";
import { Segmented } from "./Segmented";
import { sectionTitle, row, rowLabel, divider, toggleRow, toggleLabel, toggleSub } from "./index.css";

const HISTORY_LIMIT_OPTIONS: { value: HistoryLimit; label: string }[] = [
  { value: "h100", label: "100" },
  { value: "h500", label: "500" },
  { value: "h1000", label: "1000" },
  { value: "unlimited", label: "Unlimited" },
];

const AUTO_CLEAR_OPTIONS: { value: AutoClearAfter; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "days7", label: "7 days" },
  { value: "days30", label: "30 days" },
  { value: "days90", label: "90 days" },
];

const MULTI_PASTE_OPTIONS: { value: MultiPasteSeparator; label: string }[] = [
  { value: "none", label: "None" },
  { value: "newline", label: "Newline" },
  { value: "space", label: "Space" },
  { value: "comma", label: "Comma" },
];

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

interface GeneralTabProps {
  s: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setLaunchAtLogin: (v: boolean) => void;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
}

export function GeneralTab({ s, updateSettings, setLaunchAtLogin, theme, onThemeChange }: GeneralTabProps) {
  return (
    <>
      <div className={sectionTitle}>General</div>
      <div className={row}>
        <div className={rowLabel}>Appearance</div>
        <Segmented value={theme} options={THEME_OPTIONS} onChange={onThemeChange} />
      </div>
      <div className={divider} />
      <div className={row}>
        <div className={rowLabel}>History limit</div>
        <Segmented
          value={s.history_limit}
          options={HISTORY_LIMIT_OPTIONS}
          onChange={(v) => updateSettings({ history_limit: v })}
        />
      </div>
      <div className={row}>
        <div className={rowLabel}>Auto-clear after</div>
        <Segmented
          value={s.auto_clear_after}
          options={AUTO_CLEAR_OPTIONS}
          onChange={(v) => updateSettings({ auto_clear_after: v })}
        />
      </div>
      <div className={row}>
        <div className={rowLabel}>Multi-paste separator</div>
        <Segmented
          value={s.multi_paste_separator}
          options={MULTI_PASTE_OPTIONS}
          onChange={(v) => updateSettings({ multi_paste_separator: v })}
        />
      </div>
      <div className={divider} />
      <div className={toggleRow}>
        <div>
          <div className={toggleLabel}>Launch at login</div>
          <div className={toggleSub}>Start Kurippa automatically on login</div>
        </div>
        <Toggle checked={s.launch_at_login} onChange={setLaunchAtLogin} />
      </div>
    </>
  );
}
