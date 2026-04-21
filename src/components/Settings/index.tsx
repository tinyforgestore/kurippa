import { type ReactNode } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useSettingsApp, type Tab } from "@/hooks/useSettingsApp";
import { useTheme } from "@/hooks/useTheme";
import type { AppSettings } from "@/types/settings";
import { GeneralIcon, HotkeysIcon, PrivacyIcon, AboutIcon } from "./NavIcons";
import { GeneralTab } from "./GeneralTab";
import { HotkeysTab } from "./HotkeysTab";
import { PrivacyTab } from "./PrivacyTab";
import { AboutTab } from "./AboutTab";
import {
  win,
  titlebarSpacer,
  body,
  sidebar,
  content,
  navItem,
  navItemActive,
} from "./index.css";

const DEFAULT_SETTINGS: AppSettings = {
  history_limit: "h500",
  auto_clear_after: "off",
  multi_paste_separator: "newline",
  launch_at_login: false,
  auto_clear_passwords: false,
  ignored_apps: [],
};

export function SettingsApp() {
  const { activeTab, setActiveTab, buttonRefs, handleSidebarKeyDown } = useSettingsApp();
  const { settings, updateSettings, setLaunchAtLogin, addIgnoredApp, removeIgnoredApp } =
    useSettings();
  const { theme, setTheme } = useTheme();

  const s = settings ?? DEFAULT_SETTINGS;

  const navItems: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: "general", label: "General", icon: <GeneralIcon /> },
    { id: "hotkeys", label: "Hotkeys", icon: <HotkeysIcon /> },
    { id: "privacy", label: "Privacy", icon: <PrivacyIcon /> },
    { id: "about", label: "About", icon: <AboutIcon /> },
  ];

  return (
    <div className={win}>
      <div className={titlebarSpacer} data-tauri-drag-region />
      <div className={body}>
        <div
          className={sidebar}
          role="tablist"
          aria-orientation="vertical"
          onKeyDown={handleSidebarKeyDown}
          data-tauri-drag-region
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              ref={(el) => {
                if (el) buttonRefs.current.set(item.id, el);
              }}
              role="tab"
              aria-selected={activeTab === item.id}
              tabIndex={activeTab === item.id ? 0 : -1}
              className={`${navItem} ${activeTab === item.id ? navItemActive : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
        <div className={content} role="tabpanel">
          {activeTab === "general" && (
            <GeneralTab
              s={s}
              updateSettings={updateSettings}
              setLaunchAtLogin={setLaunchAtLogin}
              theme={theme}
              onThemeChange={setTheme}
            />
          )}
          {activeTab === "hotkeys" && <HotkeysTab />}
          {activeTab === "privacy" && (
            <PrivacyTab
              s={s}
              updateSettings={updateSettings}
              addIgnoredApp={addIgnoredApp}
              removeIgnoredApp={removeIgnoredApp}
            />
          )}
          {activeTab === "about" && <AboutTab />}
        </div>
      </div>
    </div>
  );
}
