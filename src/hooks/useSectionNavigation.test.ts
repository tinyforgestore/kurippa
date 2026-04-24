import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { Provider, createStore } from "jotai";
import { useSectionNavigation } from "@/hooks/useSectionNavigation";
import { ClipboardItem, FuzzyResult, Folder } from "@/types";
import { allItemsAtom } from "@/atoms/clipboard";
import { foldersAtom } from "@/atoms/folders";
import { queryAtom } from "@/atoms/navigation";

function makeItem(id: number, pinned = false, folder_id: number | null = null): ClipboardItem {
  return {
    id, kind: "text", text: `item-${id}`, html: null, rtf: null,
    image_path: null, source_app: null, created_at: id * 1000,
    pinned, folder_id, qr_text: null, image_width: null, image_height: null,
  };
}

function makeResult(id: number, pinned = false, folder_id: number | null = null): FuzzyResult {
  return {
    item: makeItem(id, pinned, folder_id),
    highlighted: null,
    score: 0,
    folder_name: null,
  };
}

function makeFolder(id: number, name = `Folder ${id}`): Folder {
  return { id, name, created_at: 0, position: id };
}

function setup(results: FuzzyResult[], folders: Folder[], query: string) {
  const store = createStore();
  store.set(allItemsAtom, results.map((r) => r.item));
  store.set(foldersAtom, folders);
  store.set(queryAtom, query);
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(Provider, { store }, children);
  return renderHook(() => useSectionNavigation(), { wrapper });
}

describe("useSectionNavigation", () => {
  describe("default view (no section expanded)", () => {
    it("renders a single pinned item inline (not as a header)", () => {
      const results = [makeResult(1, true), makeResult(2, false)];
      const { result } = setup(results, [], "");
      const entries = result.current.visibleEntries;
      expect(entries.some((e) => e.kind === "pinned-header")).toBe(false);
      expect(entries.some((e) => e.kind === "item" && e.result.item.id === 1)).toBe(true);
    });

    it("renders a pinned-header when there are 2 or more pinned items", () => {
      const results = [makeResult(1, true), makeResult(2, true), makeResult(3, false)];
      const { result } = setup(results, [], "");
      const header = result.current.visibleEntries.find((e) => e.kind === "pinned-header");
      expect(header).toBeDefined();
      expect(header?.kind === "pinned-header" && header.count).toBe(2);
    });

    it("renders a folder-header for each folder", () => {
      const folders = [makeFolder(10, "Work"), makeFolder(11, "Personal")];
      const { result } = setup([], folders, "");
      const headers = result.current.visibleEntries.filter((e) => e.kind === "folder-header");
      expect(headers).toHaveLength(2);
    });

    it("includes folder item count in the folder-header", () => {
      const folders = [makeFolder(10)];
      const results = [makeResult(1, false, 10), makeResult(2, false, 10)];
      const { result } = setup(results, folders, "");
      const header = result.current.visibleEntries.find((e) => e.kind === "folder-header");
      expect(header?.kind === "folder-header" && header.count).toBe(2);
    });

    it("appends regular (unpinned, unfoldered) items after headers", () => {
      const folders = [makeFolder(10)];
      const results = [makeResult(1, false, null), makeResult(2, false, 10)];
      const { result } = setup(results, folders, "");
      const items = result.current.visibleEntries.filter((e) => e.kind === "item");
      expect(items.some((e) => e.kind === "item" && e.result.item.id === 1)).toBe(true);
      expect(items.some((e) => e.kind === "item" && e.result.item.id === 2)).toBe(false);
    });
  });

  describe("expanded pinned section", () => {
    it("shows only pinned items when pinned section is entered", () => {
      const results = [makeResult(1, true), makeResult(2, true), makeResult(3, false)];
      const { result } = setup(results, [], "");

      act(() => result.current.enterPinnedSection());

      const entries = result.current.visibleEntries;
      expect(entries).toHaveLength(2);
      expect(entries.every((e) => e.kind === "item" && e.result.item.pinned)).toBe(true);
      expect(result.current.inPinnedSection).toBe(true);
    });

    it("auto-collapses pinned section when all pinned items are removed", async () => {
      const store = createStore();
      store.set(allItemsAtom, [makeItem(1, true)]);
      store.set(foldersAtom, []);
      store.set(queryAtom, "");
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        createElement(Provider, { store }, children);
      const { result } = renderHook(() => useSectionNavigation(), { wrapper });

      act(() => result.current.enterPinnedSection());
      expect(result.current.inPinnedSection).toBe(true);

      act(() => store.set(allItemsAtom, [makeItem(1, false)]));
      await act(async () => {});

      expect(result.current.inPinnedSection).toBe(false);
    });
  });

  describe("expanded folder section", () => {
    it("shows only that folder's items when a folder section is entered", () => {
      const folders = [makeFolder(10)];
      const results = [makeResult(1, false, 10), makeResult(2, false, null)];
      const { result } = setup(results, folders, "");

      act(() => result.current.enterFolderSection(10));

      const entries = result.current.visibleEntries;
      expect(entries).toHaveLength(1);
      expect(entries[0].kind === "item" && entries[0].result.item.id).toBe(1);
      expect(result.current.expandedFolderId).toBe(10);
    });

    it("auto-collapses folder section when the folder is removed from the list", async () => {
      const store = createStore();
      const folder = makeFolder(10);
      store.set(allItemsAtom, []);
      store.set(foldersAtom, [folder]);
      store.set(queryAtom, "");
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        createElement(Provider, { store }, children);
      const { result } = renderHook(() => useSectionNavigation(), { wrapper });

      act(() => result.current.enterFolderSection(10));
      expect(result.current.expandedFolderId).toBe(10);

      act(() => store.set(foldersAtom, []));
      await act(async () => {});

      expect(result.current.expandedFolderId).toBeNull();
    });

    it("exitFolderSection collapses back to default view", () => {
      const folders = [makeFolder(10)];
      const { result } = setup([], folders, "");

      act(() => result.current.enterFolderSection(10));
      expect(result.current.expandedFolderId).toBe(10);

      act(() => result.current.exitFolderSection());
      expect(result.current.expandedFolderId).toBeNull();
    });
  });

  describe("folder filtering during search", () => {
    it("hides folder header when query is non-empty and folder has 0 matching items", () => {
      const folders = [makeFolder(10, "Work")];
      const { result } = setup([], folders, "xyz");
      const headers = result.current.visibleEntries.filter((e) => e.kind === "folder-header");
      expect(headers).toHaveLength(0);
    });

    it("shows folder header when query is non-empty and folder has matching items", () => {
      const folders = [makeFolder(10, "Work")];
      const results = [makeResult(1, false, 10), makeResult(2, false, 10)];
      const { result } = setup(results, folders, "item");
      const header = result.current.visibleEntries.find((e) => e.kind === "folder-header");
      expect(header).toBeDefined();
      expect(header?.kind === "folder-header" && header.count).toBe(2);
    });

    it("shows folder header with 0 items when query is empty (no filtering)", () => {
      const folders = [makeFolder(10, "Work")];
      const { result } = setup([], folders, "");
      const headers = result.current.visibleEntries.filter((e) => e.kind === "folder-header");
      expect(headers).toHaveLength(1);
    });
  });
});
