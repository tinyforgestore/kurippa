import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

const STORAGE_KEY = "kurippa.permissions.intro.shown";

export type DialogState =
  | "checking"
  | "all_granted"
  | "intro"
  | "accessibility"
  | "input_monitoring"
  | "denied"
  | "error"
  | "done";

export interface PermissionsStatus {
  accessibility: boolean;
  input_monitoring: boolean;
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
        if (status.accessibility && status.input_monitoring) {
          setDialogState("all_granted");
          return;
        }
        const introShown = localStorage.getItem(STORAGE_KEY) !== null;
        if (!introShown) {
          setDialogState("intro");
        } else if (!status.accessibility) {
          setDialogState("accessibility");
        } else {
          setDialogState("denied");
        }
      })
      .catch(() => setDialogState("error"));
  }, []);

  useEffect(() => {
    if (dialogState === "all_granted" || dialogState === "done") {
      onDone();
    }
  }, [dialogState, onDone]);

  useEffect(() => {
    if (dialogState !== "accessibility") return;
    invoke("request_accessibility_permission").catch(console.error);
  }, [dialogState]);

  useEffect(() => {
    if (dialogState !== "input_monitoring") return;
    invoke("request_input_monitoring_permission").catch(console.error);
    setDialogState("done");
  }, [dialogState]);

  const handleGetStarted = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setDialogState("accessibility");
  };

  const handleIveAddedIt = () => {
    setDialogState("input_monitoring");
  };

  const handleOpenSystemSettings = () => {
    invoke("open_privacy_settings").catch(console.error);
  };

  const handleCheckAgain = () => {
    invoke<PermissionsStatus>("check_permissions")
      .then((status) => {
        if (status.accessibility && status.input_monitoring) {
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
