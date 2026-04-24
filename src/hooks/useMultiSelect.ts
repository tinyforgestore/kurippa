import { useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  multiSelectActiveAtom,
  multiSelectSelectionsAtom,
  multiSelectFlashingIdAtom,
  multiSelectMaxToastVisibleAtom,
} from "@/atoms/multiSelect";

export interface MultiSelectState {
  active: boolean;
  selections: number[];
  flashingId: number | null;
  maxToastVisible: boolean;
  enterMode: (initialItemId: number) => void;
  exitMode: () => void;
  toggleSelection: (itemId: number, isSelectable: boolean) => void;
}

const MAX_SELECTIONS = 5;
const FLASH_DURATION_MS = 150;
const TOAST_DURATION_MS = 1500;

export function useMultiSelect(): MultiSelectState {
  const active = useAtomValue(multiSelectActiveAtom);
  const selections = useAtomValue(multiSelectSelectionsAtom);
  const flashingId = useAtomValue(multiSelectFlashingIdAtom);
  const maxToastVisible = useAtomValue(multiSelectMaxToastVisibleAtom);

  const setActive = useSetAtom(multiSelectActiveAtom);
  const setSelections = useSetAtom(multiSelectSelectionsAtom);
  const setFlashingId = useSetAtom(multiSelectFlashingIdAtom);
  const setMaxToastVisible = useSetAtom(multiSelectMaxToastVisibleAtom);

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
