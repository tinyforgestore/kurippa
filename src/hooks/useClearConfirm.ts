import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface UseClearConfirmParams {
  clearNonPinned: () => void;
}

export interface ClearConfirmState {
  show: boolean;
  onRequest: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function useClearConfirm({ clearNonPinned }: UseClearConfirmParams): ClearConfirmState {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace" && e.metaKey && e.altKey) {
        e.preventDefault();
        setShow(true);
      }
      if (e.key === "Escape" && show) {
        e.preventDefault();
        setShow(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [show]);

  return {
    show,
    onRequest: () => setShow(true),
    onConfirm: () => {
      setShow(false);
      clearNonPinned();
      invoke("clear_history").catch(console.error);
    },
    onCancel: () => setShow(false),
  };
}
