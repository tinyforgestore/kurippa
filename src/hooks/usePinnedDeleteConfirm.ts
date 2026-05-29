import { useEffect, useState } from "react";

type HighlightedAction = "delete" | "unpin";

export function usePinnedDeleteConfirm(
  onConfirm: () => void,
  onUnpinAll: () => void,
  onCancel: () => void,
) {
  const [highlightedAction, setHighlightedAction] = useState<HighlightedAction>("delete");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedAction((prev) => (prev === "delete" ? "unpin" : "delete"));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (highlightedAction === "delete") onConfirm();
        else onUnpinAll();
        return;
      }
      if (e.key === "y" || e.key === "Y") { e.preventDefault(); onConfirm(); return; }
      if (e.key === "u" || e.key === "U") { e.preventDefault(); onUnpinAll(); return; }
      if (e.key === "Escape") { e.preventDefault(); onCancel(); return; }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [highlightedAction, onConfirm, onUnpinAll, onCancel]);

  return { highlightedAction, setHighlightedAction };
}
