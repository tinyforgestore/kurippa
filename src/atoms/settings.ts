import { atom } from "jotai";

export const defaultSeparatorAtom = atom<"newline" | "space" | "comma">("newline");
