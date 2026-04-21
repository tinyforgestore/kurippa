import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";

export type LicenseMode = "activated" | "trial" | "first_launch" | "device_limit";

export interface LicenseInfo {
  licenseKey: string;
  instanceId: string;
  activatedAt: string;
}

export interface UseLicenseReturn {
  mode: LicenseMode;
  licenseInfo: LicenseInfo | null;
  deactivate: () => Promise<void>;
  activate: (key: string) => Promise<void>;
  openActivationWindow: () => void;
}

export function useLicense(): UseLicenseReturn {
  const [mode, setMode] = useState<LicenseMode>("first_launch");
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);

  const checkLicense = useCallback(() => {
    invoke<boolean>("is_activated_cmd")
      .then((activated) => {
        if (activated) {
          setMode("activated");
          return invoke<LicenseInfo | null>("get_license_info_cmd").then((info) => {
            setLicenseInfo(info);
          });
        }
        setLicenseInfo(null);
        return load("app-store.json")
          .then((store) =>
            store.get<boolean>("trial").then((isTrial) => {
              if (isTrial) { setMode("trial"); return; }
              return store.get<boolean>("device_limit").then((isDl) => {
                setMode(isDl ? "device_limit" : "first_launch");
              });
            })
          );
      })
      .catch(console.error);
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkLicense();
  }, [checkLicense]);

  // Re-check when window becomes visible (main window shown via hotkey or after activation)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") checkLicense();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [checkLicense]);

  // Re-check on Tauri license-state-changed event (covers settings window already open)
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let mounted = true;
    import("@tauri-apps/api/event")
      .then(({ listen }) => listen("license-state-changed", () => checkLicense()))
      .then((fn) => {
        if (!mounted) { fn(); return; }
        unlisten = fn;
      })
      .catch(() => {});
    return () => {
      mounted = false;
      if (unlisten) unlisten();
    };
  }, [checkLicense]);

  const deactivate = useCallback((): Promise<void> => {
    return invoke("deactivate_license_cmd")
      .then(() => {
        setMode("trial");
        setLicenseInfo(null);
      })
      .catch((err: unknown) => {
        throw err;
      });
  }, []);

  const activate = useCallback((key: string): Promise<void> => {
    return invoke("activate_license_cmd", { key })
      .then(() => {
        setMode("activated");
        return load("app-store.json").then((store) => {
          store.delete("device_limit");
          return store.save();
        });
      })
      .catch((err: string) => {
        if (err.includes("DeviceLimitReached")) setMode("device_limit");
        throw err;
      });
  }, []);

  const openActivationWindow = useCallback(() => {
    invoke("show_activation_window").catch(console.error);
  }, []);

  return { mode, licenseInfo, deactivate, activate, openActivationWindow };
}
