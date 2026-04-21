import { useCallback, useState } from "react";
import { ClipboardItem } from "@/types";

export function usePasteAs() {
  const [pasteAsItem, setPasteAsItem] = useState<ClipboardItem | null>(null);
  const openPasteAs = useCallback((item: ClipboardItem) => setPasteAsItem(item), []);
  const closePasteAs = useCallback(() => setPasteAsItem(null), []);
  return { pasteAsItem, openPasteAs, closePasteAs };
}
