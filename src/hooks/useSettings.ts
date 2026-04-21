import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "@/types/settings";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    invoke<AppSettings>("get_settings").then(setSettings).catch(console.error);
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      invoke("save_settings", { s: next }).catch(console.error);
      return next;
    });
  }, []);

  const setLaunchAtLogin = useCallback(
    (enabled: boolean) => {
      invoke("set_launch_at_login", { enabled }).catch(console.error);
      updateSettings({ launch_at_login: enabled });
    },
    [updateSettings]
  );

  const addIgnoredApp = useCallback(() => {
    invoke<{ bundle_id: string; display_name: string } | null>("pick_app_bundle")
      .then((app) => {
        if (!app) return;
        setSettings((prev) => {
          if (!prev) return prev;
          if (prev.ignored_apps.some((a) => a.bundle_id === app.bundle_id)) return prev;
          const next = { ...prev, ignored_apps: [...prev.ignored_apps, app] };
          invoke("save_settings", { s: next }).catch(console.error);
          return next;
        });
      })
      .catch(console.error);
  }, []);

  const removeIgnoredApp = useCallback((bundleId: string) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        ignored_apps: prev.ignored_apps.filter((a) => a.bundle_id !== bundleId),
      };
      invoke("save_settings", { s: next }).catch(console.error);
      return next;
    });
  }, []);

  return { settings, updateSettings, setLaunchAtLogin, addIgnoredApp, removeIgnoredApp };
}
