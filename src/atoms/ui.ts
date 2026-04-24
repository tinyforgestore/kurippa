import { atom } from "jotai";

export const previewPanelOpenAtom = atom<boolean>(false);
export const pasteAsPreviewTextAtom = atom<string | null>(null);
export const clearConfirmShowAtom = atom<boolean>(false);
export const updateInfoAtom = atom<{ version: string } | null>(null);
