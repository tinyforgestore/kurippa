import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { expandedSectionAtom } from "@/atoms/navigation";
import { useClipboardStore, useFoldersStore, useNavigationStore } from "@/store";

export function useSectionNavigation() {
  const { expandedSection, inPinnedSection, expandedFolderId } = useNavigationStore();
  const setExpandedSection = useSetAtom(expandedSectionAtom);
  const { results, visibleEntries } = useClipboardStore();
  const { folders } = useFoldersStore();

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
