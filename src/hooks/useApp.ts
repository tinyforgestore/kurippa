import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import { useAppState } from "@/hooks/useAppState";
import { useTheme } from "@/hooks/useTheme";
import { useLicense } from "@/hooks/useLicense";
import type { PermissionsStatus } from "@/hooks/usePermissionsDialog";

export function useApp() {
  const { theme } = useTheme();
  const { mode, openActivationWindow } = useLicense();

  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [activatedToast, setActivatedToast] = useState(false);
  const [revokedBanner, setRevokedBanner] = useState(false);
  const [upgradeBannerFeature, setUpgradeBannerFeature] = useState<string | null>(null);

  const onTrialError = useCallback((feature: string) => setUpgradeBannerFeature(feature), []);

  const appState = useAppState({
    onTrialError,
    isActivated: mode === "activated",
  });

  const checkStoreFlags = useCallback(() => {
    load("app-store.json")
      .then((store) => {
        return store.get<boolean>("just_activated").then((val) => {
          if (val) {
            setActivatedToast(true);
            store.delete("just_activated");
            store.save().catch(console.error);
            setTimeout(() => setActivatedToast(false), 2000);
          }
          return store.get<boolean>("license_revoked");
        });
      })
      .then((revoked) => {
        if (revoked) setRevokedBanner(true);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    invoke<PermissionsStatus>("check_permissions")
      .then((status) => {
        if (!status.accessibility) {
          setShowPermissionsDialog(true);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    checkStoreFlags();
  }, [checkStoreFlags]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") checkStoreFlags();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [checkStoreFlags]);

  const dismissUpgradeBanner = useCallback(() => setUpgradeBannerFeature(null), []);
  const onPermissionsDone = useCallback(() => setShowPermissionsDialog(false), []);

  return {
    theme,
    mode,
    openActivationWindow,
    showPermissionsDialog,
    onPermissionsDone,
    activatedToast,
    revokedBanner,
    upgradeBannerFeature,
    dismissUpgradeBanner,
    ...appState,
  };
}
