import { useEffect, useState } from "react";

export type MultiSelectAction = "merge" | "pin" | "folder";

const ACTIONS: MultiSelectAction[] = ["merge", "pin", "folder"];

export function useMultiSelectActionMenu(
  onMerge: () => void,
  onPinAll: () => void,
  onMoveToFolder: () => void,
  onCancel: () => void,
) {
  const [selectedAction, setSelectedAction] = useState<MultiSelectAction>("merge");

  useEffect(() => {
    const fire = (action: MultiSelectAction) => {
      if (action === "merge") onMerge();
      else if (action === "pin") onPinAll();
      else onMoveToFolder();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedAction((prev) => ACTIONS[(ACTIONS.indexOf(prev) + 1) % ACTIONS.length]);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedAction(
          (prev) => ACTIONS[(ACTIONS.indexOf(prev) - 1 + ACTIONS.length) % ACTIONS.length],
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        fire(selectedAction);
        return;
      }
      if (e.key === "m" || e.key === "M") { e.preventDefault(); onMerge(); return; }
      if (e.key === "p" || e.key === "P") { e.preventDefault(); onPinAll(); return; }
      if (e.key === "f" || e.key === "F") { e.preventDefault(); onMoveToFolder(); return; }
      if (e.key === "Escape") { e.preventDefault(); onCancel(); return; }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedAction, onMerge, onPinAll, onMoveToFolder, onCancel]);

  return { selectedAction, setSelectedAction };
}
