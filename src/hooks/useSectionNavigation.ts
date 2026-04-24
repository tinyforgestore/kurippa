import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { expandedSectionAtom } from "@/atoms/navigation";
import { resultsAtom, visibleEntriesAtom, inPinnedSectionAtom, expandedFolderIdAtom } from "@/atoms/derived";
import { foldersAtom } from "@/atoms/folders";

export function useSectionNavigation() {
  const expandedSection = useAtomValue(expandedSectionAtom);
  const setExpandedSection = useSetAtom(expandedSectionAtom);
  const results = useAtomValue(resultsAtom);
  const folders = useAtomValue(foldersAtom);
  const inPinnedSection = useAtomValue(inPinnedSectionAtom);
  const expandedFolderId = useAtomValue(expandedFolderIdAtom);
  const visibleEntries = useAtomValue(visibleEntriesAtom);

  const pinnedResultsLength = results.filter((r) => r.item.pinned).length;

  useEffect(() => {
    if (expandedSection === "pinned" && pinnedResultsLength === 0) {
      setExpandedSection(null);
    } else if (typeof expandedSection === "number") {
      const still = folders.some((f) => f.id === expandedSection);
      if (!still) setExpandedSection(null);
    }
  }, [expandedSection, pinnedResultsLength, folders, setExpandedSection]);

  const enterPinnedSection = () => setExpandedSection("pinned");
  const exitPinnedSection = () => setExpandedSection(null);
  const enterFolderSection = (folderId: number) => setExpandedSection(folderId);
  const exitFolderSection = () => setExpandedSection(null);

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
