import { atom } from "jotai";

export const multiSelectActiveAtom = atom<boolean>(false);
export const multiSelectSelectionsAtom = atom<number[]>([]);
export const multiSelectFlashingIdAtom = atom<number | null>(null);
export const multiSelectMaxToastVisibleAtom = atom<boolean>(false);
