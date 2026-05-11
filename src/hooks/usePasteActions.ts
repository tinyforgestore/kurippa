import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PasteOption, strategyForOption, entryForOption } from "@/utils/pasteAs";
import { execute } from "@/paste/executor";
import { TRIAL_ERROR } from "@/constants/errors";
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

    const strategy = strategyForOption(option);
    const entry = entryForOption(option);
    if (!strategy || !entry) {
      console.error("[paste] no strategy registered for option");
      return;
    }
    execute(entry, strategy).catch(console.error);
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
        if (err === TRIAL_ERROR) {
          onTrialError?.("Multi-paste");
        } else {
          console.error(err);
        }
      });
  }, [multiSelect, nav, dismiss, onTrialError]);

  return { executePasteOption, onMergePaste };
}
