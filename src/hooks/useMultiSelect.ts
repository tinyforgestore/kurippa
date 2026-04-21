import { useRef, useState } from "react";

export interface MultiSelectState {
  active: boolean;
  selections: number[]; // item IDs in selection order (max 5)
  flashingId: number | null; // item that flashed due to max-5 attempt
  maxToastVisible: boolean; // "Max 5 items" message
  enterMode: (initialItemId: number) => void;
  exitMode: () => void;
  toggleSelection: (itemId: number, isSelectable: boolean) => void;
}

const MAX_SELECTIONS = 5;
const FLASH_DURATION_MS = 150;
const TOAST_DURATION_MS = 1500;

export function useMultiSelect(): MultiSelectState {
  const [active, setActive] = useState(false);
  const [selections, setSelections] = useState<number[]>([]);
  const [flashingId, setFlashingId] = useState<number | null>(null);
  const [maxToastVisible, setMaxToastVisible] = useState(false);

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enterMode = (initialItemId: number) => {
    setActive(true);
    setSelections([initialItemId]);
    setFlashingId(null);
    setMaxToastVisible(false);
  };

  const exitMode = () => {
    setActive(false);
    setSelections([]);
    setFlashingId(null);
    setMaxToastVisible(false);
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  };

  const toggleSelection = (itemId: number, isSelectable: boolean) => {
    if (!isSelectable) return;

    setSelections((prev) => {
      const alreadySelected = prev.includes(itemId);
      if (alreadySelected) {
        return prev.filter((id) => id !== itemId);
      }
      if (prev.length >= MAX_SELECTIONS) {
        // Flash the item and show the toast
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setFlashingId(itemId);
        setMaxToastVisible(true);
        flashTimerRef.current = setTimeout(() => {
          setFlashingId(null);
          flashTimerRef.current = null;
        }, FLASH_DURATION_MS);
        toastTimerRef.current = setTimeout(() => {
          setMaxToastVisible(false);
          toastTimerRef.current = null;
        }, TOAST_DURATION_MS);
        return prev;
      }
      return [...prev, itemId];
    });
  };

  return {
    active,
    selections,
    flashingId,
    maxToastVisible,
    enterMode,
    exitMode,
    toggleSelection,
  };
}
