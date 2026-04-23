import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

// Set once the intro slide has been shown (permissions may not yet be granted).
const INTRO_SHOWN_KEY = "kurippa.permissions.intro.shown";
// Set once the user completes the guided setup. On subsequent launches, if
// check_permissions reports missing permissions, this key overrides the result
// so the dialog is not shown again — AXIsProcessTrusted returns false for dev
// binaries even when the toggle is ON. In production, if the user genuinely
// revokes permissions, they can reset this from Settings → Reset Permissions.
const COMPLETED_KEY = "kurippa.permissions.completed";

export type DialogState =
  | "checking"
  | "all_granted"
  | "intro"
  | "accessibility"
  | "denied"
  | "error"
  | "done";

export interface PermissionsStatus {
  accessibility: boolean;
}

export function usePermissionsDialog(onDone: () => void): {
  dialogState: DialogState;
  handleGetStarted: () => void;
  handleIveAddedIt: () => void;
  handleOpenSystemSettings: () => void;
  handleCheckAgain: () => void;
} {
  const [dialogState, setDialogState] = useState<DialogState>("checking");

  useEffect(() => {
    invoke<PermissionsStatus>("check_permissions")
      .then((status) => {
        if (status.accessibility) {
          setDialogState("all_granted");
          return;
        }
        if (localStorage.getItem(COMPLETED_KEY) !== null) {
          setDialogState("all_granted");
          return;
        }
        const introShown = localStorage.getItem(INTRO_SHOWN_KEY) !== null;
        if (!introShown) {
          setDialogState("intro");
        } else {
          setDialogState("accessibility");
        }
      })
      .catch(() => setDialogState("error"));
  }, []);

  useEffect(() => {
    if (dialogState === "done") {
      // User completed the guided setup — persist so dev-build hash changes
      // don't re-show the dialog on subsequent launches.
      localStorage.setItem(COMPLETED_KEY, "1");
      onDone();
    } else if (dialogState === "all_granted") {
      // Permissions already active — call onDone without persisting; we still
      // re-check on next launch in case the user revokes them.
      onDone();
    }
  }, [dialogState, onDone]);

  useEffect(() => {
    if (dialogState !== "accessibility") return;
    invoke("request_accessibility_permission").catch(console.error);
  }, [dialogState]);

  const handleGetStarted = () => {
    localStorage.setItem(INTRO_SHOWN_KEY, "1");
    invoke<PermissionsStatus>("check_permissions")
      .then((status) => setDialogState(status.accessibility ? "done" : "accessibility"))
      .catch(() => setDialogState("accessibility"));
  };

  const handleIveAddedIt = () => {
    invoke<PermissionsStatus>("check_permissions")
      .then((status) => setDialogState(status.accessibility ? "done" : "denied"))
      .catch(() => setDialogState("denied"));
  };

  const handleOpenSystemSettings = () => {
    invoke("open_privacy_settings").catch(console.error);
  };

  const handleCheckAgain = () => {
    invoke<PermissionsStatus>("check_permissions")
      .then((status) => {
        if (status.accessibility) {
          setDialogState("done");
        }
      })
      .catch(() => setDialogState("error"));
  };

  return {
    dialogState,
    handleGetStarted,
    handleIveAddedIt,
    handleOpenSystemSettings,
    handleCheckAgain,
  };
}
