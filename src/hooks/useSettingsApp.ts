import { useState, useCallback, useRef } from "react";

export type Tab = "general" | "hotkeys" | "privacy" | "about";

const TABS: Tab[] = ["general", "hotkeys", "privacy", "about"];

export function useSettingsApp() {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const buttonRefs = useRef<Map<Tab, HTMLButtonElement>>(new Map());

  const handleSidebarKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const idx = TABS.indexOf(activeTab);
      let next: Tab | undefined;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        next = TABS[Math.min(idx + 1, TABS.length - 1)];
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        next = TABS[Math.max(idx - 1, 0)];
      }
      if (next && next !== activeTab) {
        setActiveTab(next);
        buttonRefs.current.get(next)?.focus();
      }
    },
    [activeTab]
  );

  return { activeTab, setActiveTab, buttonRefs, handleSidebarKeyDown };
}
