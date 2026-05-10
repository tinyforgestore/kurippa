import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { clearConfirmShowAtom } from "@/atoms/ui";
import { useUIStore } from "@/store";

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
  const { clearConfirmShow: show } = useUIStore();
  const setShow = useSetAtom(clearConfirmShowAtom);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace" && (e.metaKey || e.ctrlKey) && e.altKey) {
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
