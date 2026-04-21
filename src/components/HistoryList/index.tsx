import { RefObject, useRef } from "react";
import { ListEntry } from "@/types";
import { EntryItem } from "@/components/HistoryList/EntryItem";
import { FolderHeader } from "@/components/HistoryList/FolderHeader";
import { PinnedHeader } from "@/components/HistoryList/PinnedHeader";
import { list } from "@/components/HistoryList/index.css";

const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
const modKey = isMac ? "⌘" : "Ctrl+";

function shortcutLabel(index: number): string | null {
  if (index > 9) return null;
  return `${modKey}${index}`;
}

interface HistoryListProps {
  visibleEntries: ListEntry[];
  selectedIndex: number;
  listRef: RefObject<HTMLDivElement | null>;
  onHoverItem: (index: number) => void;
  onClickItem: () => void;
  onEnterSection: () => void;
  onEnterFolderSection?: (folderId: number) => void;
  expandedFolderId?: number | null;
  liftingId: number | null;
  landingId: number | null;
  deletingId: number | null;
  multiSelectActive?: boolean;
  selections?: number[];
  flashingId?: number | null;
}

export function HistoryList({
  visibleEntries,
  selectedIndex,
  listRef,
  onHoverItem,
  onClickItem,
  onEnterSection,
  onEnterFolderSection,
  expandedFolderId,
  liftingId,
  landingId,
  deletingId,
  multiSelectActive,
  selections,
  flashingId,
}: HistoryListProps) {
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);

  function handleHoverItem(index: number, e: React.MouseEvent) {
    const { clientX, clientY } = e;
    if (lastMousePos.current?.x === clientX && lastMousePos.current?.y === clientY) return;
    lastMousePos.current = { x: clientX, y: clientY };
    onHoverItem(index);
  }

  return (
    <div className={list} ref={listRef} tabIndex={0}>
      {visibleEntries.map((entry, index) => {
        if (entry.kind === "pinned-header") {
          const hint = shortcutLabel(index);
          return (
            <PinnedHeader
              key="pinned-header"
              count={entry.count}
              selected={index === selectedIndex}
              hint={hint}
              multiSelectActive={multiSelectActive}
              onClick={onEnterSection}
              onMouseMove={(e) => handleHoverItem(index, e)}
            />
          );
        }

        if (entry.kind === "folder-header") {
          const hint = shortcutLabel(index);
          return (
            <FolderHeader
              key={`folder-${entry.folderId}`}
              name={entry.name}
              count={entry.count}
              selected={index === selectedIndex}
              hint={hint}
              multiSelectActive={multiSelectActive}
              onClick={() => onEnterFolderSection?.(entry.folderId)}
              onMouseMove={(e) => handleHoverItem(index, e)}
            />
          );
        }

        const itemId = entry.result.item.id;
        const itemKind = entry.result.item.kind;
        const isSelectable = itemKind !== "image";
        const selectionIndex = selections ? selections.indexOf(itemId) : -1;
        const selectionBadge = selectionIndex >= 0 ? selectionIndex + 1 : null;
        const inFolderView = expandedFolderId != null;

        return (
          <EntryItem
            key={itemId}
            result={entry.result}
            selected={index === selectedIndex}
            hint={shortcutLabel(index)}
            lifting={itemId === liftingId}
            landing={itemId === landingId}
            deleting={itemId === deletingId}
            onMove={(e) => handleHoverItem(index, e)}
            onClick={onClickItem}
            multiSelectActive={multiSelectActive}
            selectionBadge={selectionBadge}
            isFlashing={flashingId === itemId}
            isSelectable={isSelectable}
            inFolderView={inFolderView}
          />
        );
      })}
    </div>
  );
}
