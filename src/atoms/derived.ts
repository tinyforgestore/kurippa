import { atom } from "jotai";
import { allItemsAtom } from "@/atoms/clipboard";
import { foldersAtom } from "@/atoms/folders";
import { queryAtom, expandedSectionAtom } from "@/atoms/navigation";
import { fuzzyMatch } from "@/utils/fuzzyMatch";
import { FuzzyResult, ListEntry, HISTORY_DISPLAY_LIMIT } from "@/types";

export const resultsAtom = atom<FuzzyResult[]>((get) => {
  const allItems = get(allItemsAtom);
  const folders = get(foldersAtom);
  const query = get(queryAtom);

  const folderMap = new Map(folders.map((f) => [f.id, f.name]));
  if (query.trim() === "") {
    return allItems.map((item) => ({
      item,
      highlighted: null,
      score: 0,
      folder_name: item.folder_id != null ? (folderMap.get(item.folder_id) ?? null) : null,
    }));
  }
  const matched: FuzzyResult[] = [];
  for (const item of allItems) {
    const folderName = item.folder_id != null ? (folderMap.get(item.folder_id) ?? null) : null;
    const textMatch = item.text ? fuzzyMatch(query, item.text) : null;
    const imageMatch = !textMatch && item.image_path ? fuzzyMatch(query, item.image_path) : null;
    const folderMatch = !textMatch && !imageMatch && folderName ? fuzzyMatch(query, folderName) : null;
    if (!textMatch && !imageMatch && !folderMatch) continue;
    matched.push({
      item,
      highlighted: textMatch?.highlighted ?? null,
      score: textMatch?.score ?? imageMatch?.score ?? folderMatch!.score,
      folder_name: folderName,
    });
  }
  matched.sort((a, b) => b.score - a.score || b.item.id - a.item.id);
  return matched.slice(0, HISTORY_DISPLAY_LIMIT);
});

resultsAtom.debugLabel = "resultsAtom";

export const visibleEntriesAtom = atom<ListEntry[]>((get) => {
  const results = get(resultsAtom);
  const expandedSection = get(expandedSectionAtom);
  const folders = get(foldersAtom);
  const query = get(queryAtom);

  const pinnedResults = results.filter((r) => r.item.pinned);
  const regularResults = results.filter((r) => !r.item.pinned && r.item.folder_id == null);

  const folderItems = new Map<number, typeof results>();
  for (const folder of folders) {
    folderItems.set(folder.id, results.filter((r) => r.item.folder_id === folder.id));
  }

  if (expandedSection === "pinned") {
    return pinnedResults.map((r) => ({ kind: "item" as const, result: r }));
  } else if (typeof expandedSection === "number") {
    return (folderItems.get(expandedSection) ?? []).map((r) => ({
      kind: "item" as const,
      result: r,
    }));
  } else {
    const entries: ListEntry[] = [];

    if (pinnedResults.length === 1) {
      entries.push({ kind: "item" as const, result: pinnedResults[0] });
    } else if (pinnedResults.length >= 2) {
      entries.push({ kind: "pinned-header" as const, count: pinnedResults.length });
    }

    const isSearchActive = query.trim() !== "";
    for (const folder of folders) {
      const items = folderItems.get(folder.id) ?? [];
      if (isSearchActive && items.length === 0) continue;
      entries.push({
        kind: "folder-header" as const,
        folderId: folder.id,
        name: folder.name,
        count: items.length,
        expanded: false,
      });
    }

    for (const r of regularResults) {
      entries.push({ kind: "item" as const, result: r });
    }

    return entries;
  }
});

visibleEntriesAtom.debugLabel = "visibleEntriesAtom";

export const inPinnedSectionAtom = atom((get) => get(expandedSectionAtom) === "pinned");
export const expandedFolderIdAtom = atom((get) => {
  const s = get(expandedSectionAtom);
  return typeof s === "number" ? s : null;
});
