import { atom } from "jotai";
import { ClipboardItem } from "@/types";

export const allItemsAtom = atom<ClipboardItem[]>([]);
export const deletingIdAtom = atom<number | null>(null);
export const liftingIdAtom = atom<number | null>(null);
export const landingIdAtom = atom<number | null>(null);
