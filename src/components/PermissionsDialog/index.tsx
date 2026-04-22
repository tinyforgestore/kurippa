import { usePermissionsDialog } from "@/hooks/usePermissionsDialog";
import { backdrop, body, card, primaryButton, secondaryButton, title } from "./index.css";

export type { PermissionsStatus } from "@/hooks/usePermissionsDialog";

interface Props {
  onDone: () => void;
}

export function PermissionsDialog({ onDone }: Props) {
  const { dialogState, handleGetStarted, handleIveAddedIt, handleOpenSystemSettings, handleCheckAgain } =
    usePermissionsDialog(onDone);

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
