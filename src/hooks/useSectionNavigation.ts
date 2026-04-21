import { useState, useEffect } from "react";
import { FuzzyResult, Folder, ListEntry } from "@/types";

export function useSectionNavigation(results: FuzzyResult[], folders: Folder[], query: string) {
  const [expandedSection, setExpandedSection] = useState<null | "pinned" | number>(null);

  const pinnedResults = results.filter((r) => r.item.pinned);
  const regularResults = results.filter((r) => !r.item.pinned && r.item.folder_id == null);

  const folderItems = new Map<number, FuzzyResult[]>();
  for (const folder of folders) {
    folderItems.set(folder.id, results.filter((r) => r.item.folder_id === folder.id));
  }

  useEffect(() => {
    if (expandedSection === "pinned" && pinnedResults.length === 0) {
      setExpandedSection(null);
    } else if (typeof expandedSection === "number") {
      const still = folders.some((f) => f.id === expandedSection);
      if (!still) setExpandedSection(null);
    }
  }, [expandedSection, pinnedResults.length, folders]);

  const enterPinnedSection = () => setExpandedSection("pinned");
  const exitPinnedSection = () => setExpandedSection(null);
  const enterFolderSection = (folderId: number) => setExpandedSection(folderId);
  const exitFolderSection = () => setExpandedSection(null);

  const inPinnedSection = expandedSection === "pinned";
  const expandedFolderId = typeof expandedSection === "number" ? expandedSection : null;

  let visibleEntries: ListEntry[];

  if (expandedSection === "pinned") {
    visibleEntries = pinnedResults.map((r) => ({ kind: "item" as const, result: r }));
  } else if (typeof expandedSection === "number") {
    visibleEntries = (folderItems.get(expandedSection) ?? []).map((r) => ({
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

    visibleEntries = entries;
  }

  return {
    visibleEntries,
    inPinnedSection,
    expandedFolderId,
    enterPinnedSection,
    exitPinnedSection,
    enterFolderSection,
    exitFolderSection,
  };
}
