import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PasteOption } from "@/utils/pasteAs";
import { useAppNavigation } from "@/hooks/useAppNavigation";

interface UsePasteActionsParams {
  multiSelect: { selections: number[]; exitMode: () => void };
  dismiss: () => void;
  onTrialError?: (feature: string) => void;
}

export function usePasteActions({ multiSelect, dismiss, onTrialError }: UsePasteActionsParams) {
  const nav = useAppNavigation();

  const executePasteOption = useCallback((option: PasteOption) => {
    const { action } = option;
    if (!action) return;
    nav.toHistory();
    if (action.kind === "paste-image") {
      invoke("paste_image_item", { imageFilename: action.imageFilename, itemId: action.itemId }).catch(console.error);
    } else {
      invoke("paste_item", {
        text: action.text,
        plainText: action.kind === "paste-text",
        itemId: action.itemId,
      }).catch(console.error);
    }
  }, [nav]);

  const onMergePaste = useCallback((separator: string) => {
    invoke("merge_and_paste_items", {
      itemIds: multiSelect.selections,
      separator,
    })
      .then(() => {
        multiSelect.exitMode();
        nav.toHistory();
        dismiss();
      })
      .catch((err: string) => {
        if (err === "trial") {
          onTrialError?.("Multi-paste");
        } else {
          console.error(err);
        }
      });
  }, [multiSelect, nav, dismiss, onTrialError]);

  return { executePasteOption, onMergePaste };
}
