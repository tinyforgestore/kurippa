import { atom } from "jotai";

export const queryAtom = atom<string>("");
export const selectedIndexAtom = atom<number>(0);
export const expandedSectionAtom = atom<null | "pinned" | number>(null);
