import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PasteOption } from "@/utils/pasteAs";
import { AppScreen } from "@/hooks/useAppState";

interface MultiSelectHandle {
  selections: number[];
  exitMode: () => void;
}

interface UsePasteActionsParams {
  setScreen: (s: AppScreen) => void;
  multiSelect: MultiSelectHandle;
  dismiss: () => void;
  onTrialError?: (feature: string) => void;
}

export function usePasteActions({ setScreen, multiSelect, dismiss, onTrialError }: UsePasteActionsParams) {
  const executePasteOption = useCallback((option: PasteOption) => {
    const { action } = option;
    if (!action) return;
    setScreen({ kind: "history" });
    if (action.kind === "paste-image") {
      invoke("paste_image_item", { imageFilename: action.imageFilename, itemId: action.itemId }).catch(console.error);
    } else {
      invoke("paste_item", {
        text: action.text,
        plainText: action.kind === "paste-text",
        itemId: action.itemId,
      }).catch(console.error);
    }
  }, [setScreen]);

  const onMergePaste = useCallback((separator: string) => {
    invoke("merge_and_paste_items", {
      itemIds: multiSelect.selections,
      separator,
    })
      .then(() => {
        multiSelect.exitMode();
        setScreen({ kind: "history" });
        dismiss();
      })
      .catch((err: string) => {
        if (err === "trial") {
          onTrialError?.("Multi-paste");
        } else {
          console.error(err);
        }
      });
  }, [multiSelect, setScreen, dismiss, onTrialError]);

  return { executePasteOption, onMergePaste };
}
