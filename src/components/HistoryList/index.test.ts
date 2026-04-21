import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, RefObject } from "react";
import { HistoryList } from "@/components/HistoryList/index";
import { ListEntry } from "@/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("./index.css", () => ({
  list: "",
  listRow: "",
  itemSelected: "itemSelected",
  pinnedHeader: "pinnedHeader",
  pinnedHeaderLabel: "",
  pinnedHeaderIcon: "",
  shortcutHint: "",
  folderHeader: "folderHeader",
  folderHeaderIcon: "",
  folderHeaderLabel: "",
  folderItemAccent: "",
}));

// Mock EntryItem as a simple div with data-entry-item attribute
vi.mock("./EntryItem", () => ({
  EntryItem: (props: { selected: boolean; result: { item: { id: number } } }) =>
    createElement("div", {
      "data-entry-item": true,
      "data-selected": props.selected || undefined,
      "data-id": props.result.item.id,
    }),
}));

// Mock lucide-react Pin icon
vi.mock("lucide-react", () => ({
  Pin: () => null,
  Folder: () => null,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItemEntry(id: number, text: string): ListEntry {
  return {
    kind: "item",
    result: {
      item: {
        id,
        kind: "text",
        text,
        html: null,
        rtf: null,
        image_path: null,
        source_app: null,
        created_at: id * 1000,
        pinned: false,
        folder_id: null,
        qr_text: null,
        image_width: null,
        image_height: null,
      },
      highlighted: text,
      score: 100,
      folder_name: null,
    },
  };
}

function makePinnedHeaderEntry(count: number): ListEntry {
  return { kind: "pinned-header", count };
}

function makeFolderHeaderEntry(folderId: number, name: string, count = 2): ListEntry {
  return { kind: "folder-header", folderId, name, count, expanded: false };
}

function makeProps(overrides: Partial<Parameters<typeof HistoryList>[0]> = {}) {
  return {
    visibleEntries: [] as ListEntry[],
    selectedIndex: 0,
    listRef: { current: null } as RefObject<HTMLDivElement | null>,
    onHoverItem: vi.fn(),
    onClickItem: vi.fn(),
    onEnterSection: vi.fn(),
    liftingId: null,
    landingId: null,
    deletingId: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HistoryList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering item entries", () => {
    it("renders one EntryItem per item entry in visibleEntries", () => {
      const entries: ListEntry[] = [
        makeItemEntry(1, "first"),
        makeItemEntry(2, "second"),
        makeItemEntry(3, "third"),
      ];

      render(createElement(HistoryList, makeProps({ visibleEntries: entries, selectedIndex: 0 })));

      const entryItems = document.querySelectorAll("[data-entry-item]");
      expect(entryItems).toHaveLength(3);
    });

    it("passes selected=true to the entry at selectedIndex", () => {
      const entries: ListEntry[] = [
        makeItemEntry(1, "first"),
        makeItemEntry(2, "second"),
      ];

      render(createElement(HistoryList, makeProps({ visibleEntries: entries, selectedIndex: 1 })));

      const entryItems = document.querySelectorAll("[data-entry-item]");
      expect(entryItems[0]).not.toHaveAttribute("data-selected");
      expect(entryItems[1]).toHaveAttribute("data-selected");
    });

    it("passes selected=false to entries not at selectedIndex", () => {
      const entries: ListEntry[] = [
        makeItemEntry(1, "first"),
        makeItemEntry(2, "second"),
        makeItemEntry(3, "third"),
      ];

      render(createElement(HistoryList, makeProps({ visibleEntries: entries, selectedIndex: 2 })));

      const entryItems = document.querySelectorAll("[data-entry-item]");
      expect(entryItems[0]).not.toHaveAttribute("data-selected");
      expect(entryItems[1]).not.toHaveAttribute("data-selected");
      expect(entryItems[2]).toHaveAttribute("data-selected");
    });
  });

  describe("rendering the pinned-header entry", () => {
    it("renders a header element with data-pinned-header when visibleEntries includes a pinned-header", () => {
      const entries: ListEntry[] = [
        makePinnedHeaderEntry(3),
        makeItemEntry(1, "pinned item"),
      ];

      render(createElement(HistoryList, makeProps({ visibleEntries: entries, selectedIndex: 0 })));

      expect(document.querySelector("[data-pinned-header]")).toBeInTheDocument();
    });

    it("renders the count in the pinned-header text", () => {
      const entries: ListEntry[] = [makePinnedHeaderEntry(3)];

      render(createElement(HistoryList, makeProps({ visibleEntries: entries, selectedIndex: 0 })));

      expect(screen.getByText("Pinned (3)")).toBeInTheDocument();
    });

    it("renders shortcut hint for pinned-header at index 0", () => {
      // index 0 should show shortcut hint
      const entries: ListEntry[] = [makePinnedHeaderEntry(1)];

      const { container } = render(
        createElement(HistoryList, makeProps({ visibleEntries: entries, selectedIndex: 0 }))
      );

      // shortcutHint span should be present
      const header = container.querySelector("[data-pinned-header]");
      expect(header).toBeInTheDocument();
      // The hint text at index 0 — either "⌘0" or "Ctrl+0"
      const hintText = header?.textContent;
      expect(hintText).toMatch(/0/);
    });

    it("renders shortcut hint for pinned-header at index 9", () => {
      // 9 item entries before the pinned-header → header is at index 9
      const entries: ListEntry[] = [
        makeItemEntry(1, "i1"),
        makeItemEntry(2, "i2"),
        makeItemEntry(3, "i3"),
        makeItemEntry(4, "i4"),
        makeItemEntry(5, "i5"),
        makeItemEntry(6, "i6"),
        makeItemEntry(7, "i7"),
        makeItemEntry(8, "i8"),
        makeItemEntry(9, "i9"),
        makePinnedHeaderEntry(2),
      ];

      const { container } = render(
        createElement(HistoryList, makeProps({ visibleEntries: entries, selectedIndex: 0 }))
      );

      const header = container.querySelector("[data-pinned-header]");
      expect(header).toBeInTheDocument();
      const hintText = header?.textContent;
      expect(hintText).toMatch(/9/);
    });

    it("does NOT render shortcut hint for pinned-header at index 10", () => {
      // 10 item entries before the pinned-header → header is at index 10
      const entries: ListEntry[] = [
        makeItemEntry(1, "i1"),
        makeItemEntry(2, "i2"),
        makeItemEntry(3, "i3"),
        makeItemEntry(4, "i4"),
        makeItemEntry(5, "i5"),
        makeItemEntry(6, "i6"),
        makeItemEntry(7, "i7"),
        makeItemEntry(8, "i8"),
        makeItemEntry(9, "i9"),
        makeItemEntry(10, "i10"),
        makePinnedHeaderEntry(2),
      ];

      const { container } = render(
        createElement(HistoryList, makeProps({ visibleEntries: entries, selectedIndex: 0 }))
      );

      const header = container.querySelector("[data-pinned-header]");
      expect(header).toBeInTheDocument();
      // Text content should only be "Pinned (2)" with no shortcut digit
      expect(header?.textContent).toBe("Pinned (2)");
    });

    it("clicking the pinned-header calls onEnterSection", () => {
      const onEnterSection = vi.fn();
      const entries: ListEntry[] = [makePinnedHeaderEntry(2)];

      const { container } = render(
        createElement(HistoryList, makeProps({ visibleEntries: entries, onEnterSection }))
      );

      const header = container.querySelector("[data-pinned-header]");
      expect(header).toBeInTheDocument();
      fireEvent.click(header!);

      expect(onEnterSection).toHaveBeenCalledOnce();
    });

    it("mouse move on the pinned-header calls onHoverItem with the header's index", () => {
      const onHoverItem = vi.fn();
      // header is the second entry (index 1)
      const entries: ListEntry[] = [
        makeItemEntry(1, "first"),
        makePinnedHeaderEntry(2),
      ];

      const { container } = render(
        createElement(HistoryList, makeProps({ visibleEntries: entries, onHoverItem }))
      );

      const header = container.querySelector("[data-pinned-header]");
      expect(header).toBeInTheDocument();
      fireEvent.mouseMove(header!);

      expect(onHoverItem).toHaveBeenCalledWith(1);
    });
  });

  describe("rendering folder-header entries", () => {
    it("renders a folder-header element with data-folder-header", () => {
      const entries: ListEntry[] = [makeFolderHeaderEntry(10, "Work")];
      render(createElement(HistoryList, makeProps({ visibleEntries: entries })));
      expect(document.querySelector("[data-folder-header]")).toBeInTheDocument();
    });

    it("renders the folder name and count", () => {
      const entries: ListEntry[] = [makeFolderHeaderEntry(10, "Work", 4)];
      render(createElement(HistoryList, makeProps({ visibleEntries: entries })));
      expect(screen.getByText("Work (4)")).toBeInTheDocument();
    });

    it("renders shortcut hint for folder-header at index 0", () => {
      const entries: ListEntry[] = [makeFolderHeaderEntry(10, "Work")];
      const { container } = render(createElement(HistoryList, makeProps({ visibleEntries: entries })));
      const header = container.querySelector("[data-folder-header]");
      expect(header?.textContent?.length).toBeGreaterThan("Work (2)".length);
    });

    it("does not render shortcut hint when multiSelectActive is true", () => {
      const entries: ListEntry[] = [makeFolderHeaderEntry(10, "Work")];
      const { container } = render(
        createElement(HistoryList, makeProps({ visibleEntries: entries, multiSelectActive: true }))
      );
      const header = container.querySelector("[data-folder-header]");
      expect(header?.textContent).toBe("Work (2)");
    });

    it("applies itemSelected class when folder-header index matches selectedIndex", () => {
      const entries: ListEntry[] = [makeFolderHeaderEntry(10, "Work")];
      const { container } = render(
        createElement(HistoryList, makeProps({ visibleEntries: entries, selectedIndex: 0 }))
      );
      const header = container.querySelector("[data-folder-header]");
      expect(header?.className).toContain("itemSelected");
    });

    it("does not apply itemSelected class when index does not match selectedIndex", () => {
      const entries: ListEntry[] = [
        makeItemEntry(1, "first"),
        makeFolderHeaderEntry(10, "Work"),
      ];
      const { container } = render(
        createElement(HistoryList, makeProps({ visibleEntries: entries, selectedIndex: 0 }))
      );
      const header = container.querySelector("[data-folder-header]");
      expect(header?.className).not.toContain("itemSelected");
    });

    it("clicking folder-header calls onEnterFolderSection with its folderId", () => {
      const onEnterFolderSection = vi.fn();
      const entries: ListEntry[] = [makeFolderHeaderEntry(42, "Archive")];
      const { container } = render(
        createElement(HistoryList, makeProps({ visibleEntries: entries, onEnterFolderSection }))
      );
      fireEvent.click(container.querySelector("[data-folder-header]")!);
      expect(onEnterFolderSection).toHaveBeenCalledWith(42);
    });

    it("mouseMove on folder-header calls onHoverItem with its index", () => {
      const onHoverItem = vi.fn();
      const entries: ListEntry[] = [
        makeItemEntry(1, "first"),
        makeFolderHeaderEntry(10, "Work"),
      ];
      const { container } = render(
        createElement(HistoryList, makeProps({ visibleEntries: entries, onHoverItem }))
      );
      fireEvent.mouseMove(container.querySelector("[data-folder-header]")!);
      expect(onHoverItem).toHaveBeenCalledWith(1);
    });
  });

  describe("shortcutLabel boundary conditions", () => {
    it("renders shortcut hint at index 0 (boundary: ≤ 9 shows hint)", () => {
      const entries: ListEntry[] = [makePinnedHeaderEntry(1)];
      const { container } = render(
        createElement(HistoryList, makeProps({ visibleEntries: entries, selectedIndex: 0 }))
      );
      const header = container.querySelector("[data-pinned-header]");
      // At index 0, hint should be "⌘0" or "Ctrl+0"
      expect(header?.textContent).toMatch(/0/);
      // Header text should be more than just "Pinned (1)" — shortcut appended
      expect(header?.textContent?.length).toBeGreaterThan("Pinned (1)".length);
    });

    it("renders shortcut hint at index 9 (boundary: exactly 9 shows hint)", () => {
      const entries: ListEntry[] = [
        makeItemEntry(1, "a"), makeItemEntry(2, "b"), makeItemEntry(3, "c"),
        makeItemEntry(4, "d"), makeItemEntry(5, "e"), makeItemEntry(6, "f"),
        makeItemEntry(7, "g"), makeItemEntry(8, "h"), makeItemEntry(9, "i"),
        makePinnedHeaderEntry(1),
      ];
      const { container } = render(
        createElement(HistoryList, makeProps({ visibleEntries: entries, selectedIndex: 0 }))
      );
      const header = container.querySelector("[data-pinned-header]");
      expect(header?.textContent).toMatch(/9/);
    });

    it("does NOT render shortcut hint at index 10 (boundary: > 9 hides hint)", () => {
      const entries: ListEntry[] = [
        makeItemEntry(1, "a"), makeItemEntry(2, "b"), makeItemEntry(3, "c"),
        makeItemEntry(4, "d"), makeItemEntry(5, "e"), makeItemEntry(6, "f"),
        makeItemEntry(7, "g"), makeItemEntry(8, "h"), makeItemEntry(9, "i"),
        makeItemEntry(10, "j"),
        makePinnedHeaderEntry(1),
      ];
      const { container } = render(
        createElement(HistoryList, makeProps({ visibleEntries: entries, selectedIndex: 0 }))
      );
      const header = container.querySelector("[data-pinned-header]");
      expect(header?.textContent).toBe("Pinned (1)");
    });
  });
});
