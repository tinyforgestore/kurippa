import { atom } from "jotai";
import { Folder } from "@/types";

export const foldersAtom = atom<Folder[]>([]);
export const folderNameInputValueAtom = atom<string>("");
export const maxFoldersToastAtom = atom<boolean>(false);
