import { useState, useEffect } from "react";
import { FuzzyResult, ListEntry } from "@/types";

export function usePinnedSection(results: FuzzyResult[]) {
  // inPinnedSection controls whether the user has drilled into the pinned
  // section. When false, 2+ pins are always shown collapsed (header only).
  // When true, only the pinned items are shown with no header.
  const [inPinnedSection, setInPinnedSection] = useState(false);

  const pinnedResults = results.filter((r) => r.item.pinned);
  const unpinnedResults = results.filter((r) => !r.item.pinned);

  const enterPinnedSection = () => setInPinnedSection(true);
  const exitPinnedSection = () => setInPinnedSection(false);

  useEffect(() => {
    if (pinnedResults.length === 0) {
      setInPinnedSection(false);
    }
  }, [pinnedResults.length]);

  let visibleEntries: ListEntry[];

  if (inPinnedSection) {
    // Drill-down view — only pinned items, no header
    visibleEntries = pinnedResults.map((r) => ({ kind: "item" as const, result: r }));
  } else if (pinnedResults.length === 0) {
    // 0 pins — all unpinned items as {kind:"item"}
    visibleEntries = unpinnedResults.map((result) => ({ kind: "item" as const, result }));
  } else if (pinnedResults.length === 1) {
    // 1 pin — pinned item first, then unpinned
    visibleEntries = [
      { kind: "item" as const, result: pinnedResults[0] },
      ...unpinnedResults.map((result) => ({ kind: "item" as const, result })),
    ];
  } else {
    // 2+ pins — always collapsed: header only, then unpinned
    visibleEntries = [
      { kind: "pinned-header" as const, count: pinnedResults.length },
      ...unpinnedResults.map((result) => ({ kind: "item" as const, result })),
    ];
  }

  return { visibleEntries, inPinnedSection, enterPinnedSection, exitPinnedSection };
}
