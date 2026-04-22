import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { backdrop, body, card, errorText, primaryButton, secondaryButton, title } from "./index.css";

const STORAGE_KEY = "kurippa.permissions.intro.shown";

type DialogState =
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

interface Props {
  onDone: () => void;
}

export function PermissionsDialog({ onDone }: Props) {
  const [dialogState, setDialogState] = useState<DialogState>("checking");
  const [accessibilityGranted, setAccessibilityGranted] = useState(false);
  const [checkError, setCheckError] = useState(false);

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
          setAccessibilityGranted(true);
          setDialogState("input_monitoring");
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
    invoke<boolean>("request_input_monitoring_permission")
      .then((granted) => {
        setDialogState(granted ? "done" : "denied");
      })
      .catch(console.error);
  }, [dialogState]);

  const handleGetStarted = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    if (!accessibilityGranted) {
      setDialogState("accessibility");
    } else {
      setDialogState("input_monitoring");
    }
  };

  const handleIveAddedIt = () => {
    setCheckError(false);
    invoke<PermissionsStatus>("check_permissions")
      .then((status) => {
        if (status.accessibility) {
          setAccessibilityGranted(true);
          setDialogState("input_monitoring");
        } else {
          setCheckError(true);
        }
      })
      .catch(() => setDialogState("error"));
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
        // still missing — stay on denied screen
      })
      .catch(() => setDialogState("error"));
  };

  if (dialogState === "checking" || dialogState === "all_granted" || dialogState === "done") {
    return null;
  }

  return (
    <div className={backdrop}>
      <div className={card}>
        {dialogState === "intro" && (
          <>
            <div className={title}>Before we start</div>
            <div className={body}>
              {"Kurippa needs two permissions to work properly.\n\nAccessibility — to paste into your previously active window.\n\nInput Monitoring — to detect the ⌘⇧V hotkey while other apps are focused."}
            </div>
            <button className={primaryButton} onClick={handleGetStarted}>
              Get Started
            </button>
          </>
        )}
        {dialogState === "accessibility" && (
          <>
            <div className={title}>Step 1 of 2 — Accessibility</div>
            <div className={body}>
              Kurippa has opened System Settings. Under Accessibility, click + and add Kurippa from your Applications folder.
            </div>
            <button className={primaryButton} onClick={handleIveAddedIt}>
              I've added it
            </button>
            {checkError && (
              <div className={errorText}>
                Kurippa isn't in the list yet — please add it, then try again.
              </div>
            )}
          </>
        )}
        {dialogState === "input_monitoring" && (
          <>
            <div className={title}>Step 2 of 2 — Input Monitoring</div>
            <div className={body}>
              Click Allow when macOS asks if Kurippa can monitor keyboard input.
            </div>
          </>
        )}
        {dialogState === "denied" && (
          <>
            <div className={title}>Permissions needed</div>
            <div className={body}>
              Kurippa can't fully function without both permissions. Open System Settings → Privacy & Security and enable Accessibility and Input Monitoring for Kurippa.
            </div>
            <button className={primaryButton} onClick={handleOpenSystemSettings}>
              Open System Settings
            </button>
            <button className={secondaryButton} onClick={handleCheckAgain}>
              Check Again
            </button>
          </>
        )}
        {dialogState === "error" && (
          <>
            <div className={title}>Something went wrong</div>
            <div className={body}>
              Could not check permissions. Please restart Kurippa.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
