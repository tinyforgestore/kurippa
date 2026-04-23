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
              {"Kurippa needs one permission to work properly.\n\nAccessibility — to paste into your previously active window."}
            </div>
            <button className={primaryButton} onClick={handleGetStarted}>
              Get Started
            </button>
          </>
        )}
        {dialogState === "accessibility" && (
          <>
            <div className={title}>Enable Accessibility</div>
            <div className={body}>
              Kurippa has opened System Settings. Under Accessibility, click + and add Kurippa from your Applications folder.
            </div>
            <button className={primaryButton} onClick={handleIveAddedIt}>
              I've added it
            </button>
          </>
        )}
        {dialogState === "denied" && (
          <>
            <div className={title}>Permissions needed</div>
            <div className={body}>
              Kurippa can't fully function without Accessibility. Open System Settings → Privacy & Security and enable Accessibility for Kurippa.
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
