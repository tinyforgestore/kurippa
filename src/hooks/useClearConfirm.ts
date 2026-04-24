import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { clearConfirmShowAtom } from "@/atoms/ui";

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
  const show = useAtomValue(clearConfirmShowAtom);
  const setShow = useSetAtom(clearConfirmShowAtom);

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
  }, [show, setShow]);

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
