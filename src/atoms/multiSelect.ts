import { atom } from "jotai";

export const multiSelectActiveAtom = atom<boolean>(false);
export const multiSelectSelectionsAtom = atom<number[]>([]);
export const multiSelectFlashingIdAtom = atom<number | null>(null);
export const multiSelectMaxToastVisibleAtom = atom<boolean>(false);
// Cap in effect the last time the max-selection guard fired (e.g. 10 for
// regular items, MAX_IMAGE_COMBINE for images). Plain literal default —
// intentionally not imported from useMultiSelect.ts to avoid a circular import.
export const multiSelectMaxToastCapAtom = atom<number>(10);
