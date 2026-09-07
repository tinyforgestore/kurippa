import { useRef } from "react";
import { useAtom, useSetAtom } from "jotai";
import {
  multiSelectActiveAtom,
  multiSelectSelectionsAtom,
  multiSelectFlashingIdAtom,
  multiSelectMaxToastVisibleAtom,
  multiSelectMaxToastCapAtom,
} from "@/atoms/multiSelect";
import { useMultiSelectStore } from "@/store";

export interface MultiSelectState {
  active: boolean;
  selections: number[];
  flashingId: number | null;
  maxToastVisible: boolean;
  maxToastCap: number;
  enterMode: (initialItemId: number) => void;
  exitMode: () => void;
  toggleSelection: (itemId: number, isSelectable: boolean, cap?: number) => void;
}

export const MAX_SELECTIONS = 10;
export const MAX_IMAGE_COMBINE = 4;
const FLASH_DURATION_MS = 150;
const TOAST_DURATION_MS = 1500;

export function useMultiSelect(): MultiSelectState {
  const { active, selections, flashingId, maxToastVisible } = useMultiSelectStore();

  const setActive = useSetAtom(multiSelectActiveAtom);
  const setSelections = useSetAtom(multiSelectSelectionsAtom);
  const setFlashingId = useSetAtom(multiSelectFlashingIdAtom);
  const setMaxToastVisible = useSetAtom(multiSelectMaxToastVisibleAtom);
  const [maxToastCap, setMaxToastCap] = useAtom(multiSelectMaxToastCapAtom);

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enterMode = (initialItemId: number) => {
    setActive(true);
    setSelections([initialItemId]);
    setFlashingId(null);
    setMaxToastVisible(false);
    setMaxToastCap(MAX_SELECTIONS);
  };

  const exitMode = () => {
    setActive(false);
    setSelections([]);
    setFlashingId(null);
    setMaxToastVisible(false);
    setMaxToastCap(MAX_SELECTIONS);
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  };

  const toggleSelection = (itemId: number, isSelectable: boolean, cap: number = MAX_SELECTIONS) => {
    if (!isSelectable) return;

    setSelections((prev) => {
      const alreadySelected = prev.includes(itemId);
      if (alreadySelected) {
        return prev.filter((id) => id !== itemId);
      }
      if (prev.length >= cap) {
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setFlashingId(itemId);
        setMaxToastVisible(true);
        setMaxToastCap(cap);
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
    maxToastCap,
    enterMode,
    exitMode,
    toggleSelection,
  };
}
