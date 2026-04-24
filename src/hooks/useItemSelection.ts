import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { ClipboardItem, ListEntry } from "@/types";

type FolderEntry = Extract<ListEntry, { kind: "folder-header" }>;
type ItemEntry = Extract<ListEntry, { kind: "item" }>;
import { itemDisplayLabel } from "@/utils/format";
import { info } from "@tauri-apps/plugin-log";
import { useDeleteAnimation } from "@/hooks/useDeleteAnimation";
import { queryAtom, selectedIndexAtom } from "@/atoms/navigation";
import { visibleEntriesAtom } from "@/atoms/derived";

interface KeyCommand {
  key: string;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  guard?: () => boolean;
  action: () => void;
}

interface UseItemSelectionOptions {
  onPinToggle: (id: number) => void;
  onDelete: (id: number) => void;
  inPinnedSection: boolean;
  onEnterSection: () => void;
  onExitSection: () => void;
  onEnterFolderSection?: (folderId: number) => void;
  onExitFolderSection?: () => void;
  expandedFolderId?: number | null;
  onDeleteFolder?: (id: number, name: string) => void;
  onOpenPreview: () => void;
  onClosePreview: () => void;
  onOpenPasteAs: (item: ClipboardItem) => void;
  enabled?: boolean;
  navigationEnabled?: boolean;
}

export function useItemSelection(
  visibleEntriesParam: ListEntry[] | undefined,
  dismiss: () => void,
  queryParam: string | undefined,
  options: UseItemSelectionOptions
) {
  const {
    onPinToggle,
    onDelete,
    inPinnedSection,
    onEnterSection,
    onExitSection,
    onEnterFolderSection,
    onExitFolderSection,
    expandedFolderId,
    onDeleteFolder,
    onOpenPreview,
    onClosePreview,
    onOpenPasteAs,
    enabled = true,
    navigationEnabled = true,
  } = options;

  const atomVisibleEntries = useAtomValue(visibleEntriesAtom);
  const atomQuery = useAtomValue(queryAtom);
  const visibleEntries = visibleEntriesParam ?? atomVisibleEntries;
  const query = queryParam ?? atomQuery;

  const selectedIndex = useAtomValue(selectedIndexAtom);
  const setSelectedIndex = useSetAtom(selectedIndexAtom);
  const listRef = useRef<HTMLDivElement>(null);
  const visibleEntriesLengthRef = useRef(visibleEntries.length);
  // eslint-disable-next-line react-hooks/refs
  visibleEntriesLengthRef.current = visibleEntries.length;

  const getEntriesLength = useCallback(() => visibleEntriesLengthRef.current, []);
  const { deletingId, triggerDelete } = useDeleteAnimation(onDelete, setSelectedIndex, getEntriesLength);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const pasteEntry = useCallback((entry: ListEntry, plainText: boolean) => {
    if (entry.kind !== "item") return;
    const item = entry.result.item;
    if (item.kind === "image" && !plainText && item.image_path != null) {
      invoke("paste_image_item", { imageFilename: item.image_path, itemId: item.id }).catch(console.error);
    } else {
      const text = item.text ?? itemDisplayLabel(item);
      invoke("paste_item", { text, plainText, itemId: item.id }).catch(console.error);
    }
    setSelectedIndex(0);
  }, []);

  const pasteSelected = useCallback(
    (plainText: boolean) => {
      const entry = visibleEntries[selectedIndex];
      if (!entry) return;
      pasteEntry(entry, plainText);
    },
    [visibleEntries, selectedIndex, pasteEntry]
  );

  const currentEntry = visibleEntries[selectedIndex];

  const commands = useMemo((): KeyCommand[] => [
    { key: "ArrowDown", guard: () => navigationEnabled,
      action: () => setSelectedIndex((i) => Math.min(i + 1, visibleEntries.length - 1)) },
    { key: "ArrowUp", guard: () => navigationEnabled,
      action: () => setSelectedIndex((i) => Math.max(i - 1, 0)) },
    { key: "ArrowRight", guard: () => navigationEnabled && currentEntry?.kind === "pinned-header",
      action: () => { onEnterSection(); setSelectedIndex(0); } },
    { key: "ArrowRight", guard: () => navigationEnabled && currentEntry?.kind === "folder-header",
      action: () => { onEnterFolderSection?.((currentEntry as FolderEntry).folderId); setSelectedIndex(0); } },
    { key: "ArrowLeft", guard: () => navigationEnabled && inPinnedSection,
      action: () => { onExitSection(); setSelectedIndex(0); } },
    { key: "ArrowLeft", guard: () => navigationEnabled && expandedFolderId != null,
      action: () => { onExitFolderSection?.(); setSelectedIndex(0); } },

    { key: "Escape", guard: () => enabled,
      action: () => dismiss() },
    { key: "Enter", guard: () => enabled && currentEntry?.kind === "pinned-header",
      action: () => { onEnterSection(); setSelectedIndex(0); } },
    { key: "Enter", guard: () => enabled && currentEntry?.kind === "folder-header",
      action: () => { onEnterFolderSection?.((currentEntry as FolderEntry).folderId); setSelectedIndex(0); } },
    { key: "Enter", shift: true, guard: () => enabled && currentEntry?.kind === "item",
      action: () => onOpenPasteAs((currentEntry as ItemEntry).result.item) },
    { key: "Enter", guard: () => enabled,
      action: () => pasteSelected(false) },
    { key: "ArrowRight", guard: () => enabled && currentEntry?.kind === "item",
      action: () => onOpenPreview() },
    { key: "ArrowLeft", guard: () => enabled && currentEntry?.kind === "item",
      action: () => onClosePreview() },

    { key: "p", meta: true, guard: () => enabled && currentEntry?.kind === "item",
      action: () => { info("Pin toggle key pressed, attempting to toggle pin on item"); onPinToggle((currentEntry as ItemEntry).result.item.id); } },
    { key: "Backspace", meta: true, guard: () => enabled && currentEntry?.kind === "folder-header",
      action: () => onDeleteFolder?.((currentEntry as FolderEntry).folderId, (currentEntry as FolderEntry).name) },
    { key: "Delete", meta: true, guard: () => enabled && currentEntry?.kind === "folder-header",
      action: () => onDeleteFolder?.((currentEntry as FolderEntry).folderId, (currentEntry as FolderEntry).name) },
    { key: "Backspace", meta: true, guard: () => enabled && currentEntry?.kind === "item" && deletingId === null,
      action: () => { info("Delete key pressed with modifier, attempting to delete item"); triggerDelete((currentEntry as ItemEntry).result.item.id); } },
    { key: "Delete", meta: true, guard: () => enabled && currentEntry?.kind === "item" && deletingId === null,
      action: () => { info("Delete key pressed with modifier, attempting to delete item"); triggerDelete((currentEntry as ItemEntry).result.item.id); } },
  ], [
    navigationEnabled,
    visibleEntries,
    currentEntry,
    onEnterSection,
    onEnterFolderSection,
    onExitSection,
    onExitFolderSection,
    inPinnedSection,
    expandedFolderId,
    enabled,
    dismiss,
    onOpenPasteAs,
    pasteSelected,
    onOpenPreview,
    onClosePreview,
    onPinToggle,
    onDeleteFolder,
    deletingId,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const pressed = {
        key: e.key,
        meta: e.metaKey || e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
      };

      const command = commands.find((cmd) =>
        cmd.key === pressed.key &&
        !!cmd.meta === pressed.meta &&
        !!cmd.shift === pressed.shift &&
        !!cmd.alt === pressed.alt &&
        (cmd.guard?.() ?? true)
      );

      if (command) {
        e.preventDefault();
        command.action();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [commands]);

  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if (!(e.metaKey || e.ctrlKey) || !/^[0-9]$/.test(e.key)) return;
      e.preventDefault();
      const target = visibleEntries[parseInt(e.key, 10)];
      if (!target) return;
      if (target.kind === "item") pasteEntry(target, false);
      if (target.kind === "pinned-header") { onEnterSection(); setSelectedIndex(0); }
      if (target.kind === "folder-header") { onEnterFolderSection?.(target.folderId); setSelectedIndex(0); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, visibleEntries, pasteEntry, onEnterSection, onEnterFolderSection]);

  useEffect(() => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll<HTMLElement>(
        "[data-item], [data-pinned-header], [data-folder-header]"
      );
      items[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  return { selectedIndex, setSelectedIndex, listRef, pasteSelected, deletingId };
}
