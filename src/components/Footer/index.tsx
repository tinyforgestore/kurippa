import { Settings, Trash2, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import {
  confirmCancelButton,
  confirmLabel,
  confirmRow,
  confirmYesButton,
  footer,
  footerButton,
  footerDivider,
  footerHint,
} from "@/components/Footer/index.css";

interface FooterProps {
  showConfirm: boolean;
  onRequestClear: () => void;
  onConfirmClear: () => void;
  onCancelClear: () => void;
}

export function Footer({ showConfirm, onRequestClear, onConfirmClear, onCancelClear }: FooterProps) {
  return (
    <div className={footer}>
      {showConfirm ? (
        <div className={confirmRow}>
          <span className={confirmLabel}>Clear all history?</span>
          <button className={confirmYesButton} onClick={onConfirmClear} autoFocus>
            Clear
          </button>
          <button className={confirmCancelButton} onClick={onCancelClear}>
            Cancel
          </button>
        </div>
      ) : (
        <>
          <button
            className={footerButton}
            onClick={() => invoke("open_settings_window").catch(console.error)}
          >
            <Settings size={11} />
            <span>Settings</span>
            <span className={footerHint}>⌘,</span>
          </button>
          <div className={footerDivider} />
          <button className={footerButton} onClick={onRequestClear}>
            <Trash2 size={11} />
            <span>Clear</span>
            <span className={footerHint}>⌥⌘⌫</span>
          </button>
          <div className={footerDivider} />
          <button
            className={footerButton}
            onClick={() => invoke("quit_app").catch(console.error)}
          >
            <X size={11} />
            <span>Quit</span>
            <span className={footerHint}>⌘Q</span>
          </button>
        </>
      )}
    </div>
  );
}
