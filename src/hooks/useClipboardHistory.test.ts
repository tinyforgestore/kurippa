import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { Provider, createStore } from "jotai";
import { StoreProvider } from "@/store";
import { useClipboardHistory } from "@/hooks/useClipboardHistory";
import { ClipboardItem, HISTORY_DISPLAY_LIMIT, Folder } from "@/types";
import { foldersAtom } from "@/atoms/folders";
import { queryAtom } from "@/atoms/navigation";
import { CLIPBOARD_UPDATED, HISTORY_CLEARED } from "@/constants/events";

type ClipboardUpdatedCb = (event: { payload: ReturnType<typeof makeItem> }) => void;
type HistoryClearedCb = () => void;

let capturedClipboardUpdated: ClipboardUpdatedCb | null = null;
let capturedHistoryCleared: HistoryClearedCb | null = null;

vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn().mockResolvedValue(undefined),
  error: vi.fn().mockResolvedValue(undefined),
  warn: vi.fn().mockResolvedValue(undefined),
  debug: vi.fn().mockResolvedValue(undefined),
  trace: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn((eventName: string, cb: ClipboardUpdatedCb | HistoryClearedCb) => {
    if (eventName === CLIPBOARD_UPDATED) capturedClipboardUpdated = cb as ClipboardUpdatedCb;
    if (eventName === HISTORY_CLEARED) capturedHistoryCleared = cb as HistoryClearedCb;
    return Promise.resolve(() => {});
  }),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

function makeItem(id: number, pinned = false) {
  return {
    id,
    kind: "text" as const,
    text: `item-${id}`,
    html: null,
    rtf: null,
    image_path: null,
    source_app: null,
    created_at: id * 1000,
    pinned,
    folder_id: null,
    qr_text: null,
    image_width: null,
    image_height: null,
  };
}

function makeFolder(id: number, name: string): Folder {
  return { id, name, created_at: id * 1000, position: id };
}

describe("useClipboardHistory", () => {
  beforeEach(() => {
    capturedClipboardUpdated = null;
    capturedHistoryCleared = null;
    mockInvoke.mockReset();
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_history") {
        return Promise.resolve([makeItem(1, false), makeItem(2, true)]);
      }
      return Promise.resolve(undefined);
    });
  });

  async function setup(query = "", folders: Folder[] = [], items?: ClipboardItem[]) {
    if (items !== undefined) {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_history") return Promise.resolve(items);
        return Promise.resolve(undefined);
      });
    }
    const store = createStore();
    store.set(queryAtom, query);
    store.set(foldersAtom, folders);
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(Provider, { store }, createElement(StoreProvider, null, children));
    const hook = renderHook(() => useClipboardHistory(), { wrapper });
    await act(async () => {});
    return hook;
  }

  describe("no-query path — highlighted is null", () => {
    it("sets highlighted to null for all items on initial load", async () => {
      const { result } = await setup("");
      for (const r of result.current.results) {
        expect(r.highlighted).toBeNull();
      }
    });

    it("sets highlighted to null after allItems changes with empty query", async () => {
      const { result } = await setup("");
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_history") return Promise.resolve([makeItem(2, true)]);
        return Promise.resolve(undefined);
      });
      await act(async () => {
        result.current.unpinItem(2);
        await Promise.resolve();
      });
      for (const r of result.current.results) {
        expect(r.highlighted).toBeNull();
      }
    });
  });

  describe("togglePinItem — pinned item", () => {
    it("calls invoke('unpin_item', { id }) and sets pinned to false", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_history") {
          return Promise.resolve([makeItem(1, true)]);
        }
        return Promise.resolve(undefined);
      });

      const { result } = await setup();

      await act(async () => {
        result.current.togglePinItem(1);
        await Promise.resolve();
      });

      expect(mockInvoke).toHaveBeenCalledWith("unpin_item", { id: 1 });
      const updated = result.current.results.find((r) => r.item.id === 1);
      expect(updated?.item.pinned).toBe(false);
    });
  });

  describe("togglePinItem — unpinned item", () => {
    it("calls invoke('pin_item', { id }) and sets pinned to true", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_history") {
          return Promise.resolve([makeItem(3, false)]);
        }
        return Promise.resolve(undefined);
      });

      const { result } = await setup();

      await act(async () => {
        result.current.togglePinItem(3);
        await Promise.resolve();
      });

      expect(mockInvoke).toHaveBeenCalledWith("pin_item", { id: 3 });
      const updated = result.current.results.find((r) => r.item.id === 3);
      expect(updated?.item.pinned).toBe(true);
    });
  });

  describe("togglePinItem — unknown id", () => {
    it("returns early with no invoke called for the toggle", async () => {
      const { result } = await setup();
      mockInvoke.mockClear();

      act(() => {
        result.current.togglePinItem(999);
      });

      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("pinItem", () => {
    it("calls invoke('pin_item', { id }) and updates state to pinned: true", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_history") {
          return Promise.resolve([makeItem(10, false)]);
        }
        return Promise.resolve(undefined);
      });

      const { result } = await setup();

      await act(async () => {
        result.current.pinItem(10);
        await Promise.resolve();
      });

      expect(mockInvoke).toHaveBeenCalledWith("pin_item", { id: 10 });
      const updated = result.current.results.find((r) => r.item.id === 10);
      expect(updated?.item.pinned).toBe(true);
    });
  });

  describe("unpinItem", () => {
    it("calls invoke('unpin_item', { id }) and updates state to pinned: false", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_history") {
          return Promise.resolve([makeItem(20, true)]);
        }
        return Promise.resolve(undefined);
      });

      const { result } = await setup();

      await act(async () => {
        result.current.unpinItem(20);
        await Promise.resolve();
      });

      expect(mockInvoke).toHaveBeenCalledWith("unpin_item", { id: 20 });
      const updated = result.current.results.find((r) => r.item.id === 20);
      expect(updated?.item.pinned).toBe(false);
    });
  });

  describe("deleteItem", () => {
    it("calls invoke('delete_item', { id }) and removes the item from results", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_history") {
          return Promise.resolve([makeItem(30, false), makeItem(31, false)]);
        }
        return Promise.resolve(undefined);
      });

      const { result } = await setup();

      await act(async () => {
        result.current.deleteItem(30);
        await Promise.resolve();
      });

      expect(mockInvoke).toHaveBeenCalledWith("delete_item", { id: 30 });
      const remaining = result.current.results.map((r) => r.item.id);
      expect(remaining).not.toContain(30);
      expect(remaining).toContain(31);
    });
  });

  describe("clipboard-updated event — dedup + promote logic", () => {
    it("promotes an existing item to the top when clipboard-updated fires with its id", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_history") {
          return Promise.resolve([makeItem(1, false), makeItem(2, false)]);
        }
        return Promise.resolve(undefined);
      });

      const { result } = await setup();

      expect(result.current.results.map((r) => r.item.id)).toEqual([1, 2]);

      await act(async () => {
        capturedClipboardUpdated!({ payload: makeItem(2, false) });
        await Promise.resolve();
      });

      const ids = result.current.results.map((r) => r.item.id);
      expect(ids[0]).toBe(2);
      expect(ids.filter((id) => id === 2)).toHaveLength(1);
    });

    it("prepends a new item when clipboard-updated fires with an unknown id", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_history") {
          return Promise.resolve([makeItem(1, false), makeItem(2, false)]);
        }
        return Promise.resolve(undefined);
      });

      const { result } = await setup();

      await act(async () => {
        capturedClipboardUpdated!({ payload: makeItem(99, false) });
        await Promise.resolve();
      });

      const ids = result.current.results.map((r) => r.item.id);
      expect(ids[0]).toBe(99);
      expect(ids).toContain(1);
      expect(ids).toContain(2);
    });

    it("caps the list at HISTORY_DISPLAY_LIMIT when a new item arrives", async () => {
      const fullList = Array.from({ length: HISTORY_DISPLAY_LIMIT }, (_, i) =>
        makeItem(i + 1, false)
      );
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_history") return Promise.resolve(fullList);
        return Promise.resolve(undefined);
      });

      const { result } = await setup();

      expect(result.current.results).toHaveLength(HISTORY_DISPLAY_LIMIT);

      await act(async () => {
        capturedClipboardUpdated!({ payload: makeItem(9999, false) });
        await Promise.resolve();
      });

      expect(result.current.results).toHaveLength(HISTORY_DISPLAY_LIMIT);
      expect(result.current.results[0].item.id).toBe(9999);
    });
  });

  describe("history-cleared event", () => {
    it("keeps pinned items and removes unpinned non-folder items", async () => {
      const pinned = makeItem(1, true);
      const unpinned = makeItem(2, false);
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_history") return Promise.resolve([pinned, unpinned]);
        return Promise.resolve(undefined);
      });
      const { result } = await setup();
      expect(result.current.results).toHaveLength(2);

      await act(async () => {
        capturedHistoryCleared!();
        await Promise.resolve();
      });

      const ids = result.current.results.map((r) => r.item.id);
      expect(ids).toContain(1);
      expect(ids).not.toContain(2);
    });

    it("keeps items with a folder_id when history is cleared", async () => {
      const foldered = { ...makeItem(3, false), folder_id: 5 };
      const unpinned = makeItem(4, false);
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_history") return Promise.resolve([foldered, unpinned]);
        return Promise.resolve(undefined);
      });
      const { result } = await setup();

      await act(async () => {
        capturedHistoryCleared!();
        await Promise.resolve();
      });

      const ids = result.current.results.map((r) => r.item.id);
      expect(ids).toContain(3);
      expect(ids).not.toContain(4);
    });
  });

  describe("clearNonPinned", () => {
    it("removes unpinned items with no folder from results immediately", async () => {
      const pinned = makeItem(10, true);
      const unpinned = makeItem(11, false);
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_history") return Promise.resolve([pinned, unpinned]);
        return Promise.resolve(undefined);
      });
      const { result } = await setup();

      act(() => result.current.clearNonPinned());

      const ids = result.current.results.map((r) => r.item.id);
      expect(ids).toContain(10);
      expect(ids).not.toContain(11);
    });

    it("keeps items with a folder_id when clearing", async () => {
      const foldered = { ...makeItem(20, false), folder_id: 9 };
      const unpinned = makeItem(21, false);
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_history") return Promise.resolve([foldered, unpinned]);
        return Promise.resolve(undefined);
      });
      const { result } = await setup();

      act(() => result.current.clearNonPinned());

      const ids = result.current.results.map((r) => r.item.id);
      expect(ids).toContain(20);
      expect(ids).not.toContain(21);
    });
  });

  describe("reloadHistory", () => {
    it("re-invokes get_history and replaces results", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_history") return Promise.resolve([makeItem(1, false)]);
        return Promise.resolve(undefined);
      });
      const { result } = await setup();
      expect(result.current.results).toHaveLength(1);

      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_history") return Promise.resolve([makeItem(5, false), makeItem(6, false)]);
        return Promise.resolve(undefined);
      });

      await act(async () => {
        result.current.reloadHistory();
        await Promise.resolve();
      });

      expect(result.current.results).toHaveLength(2);
      expect(result.current.results.map((r) => r.item.id)).toEqual([5, 6]);
    });

    it("sets highlighted to null for all reloaded items", async () => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_history") return Promise.resolve([makeItem(7, false)]);
        return Promise.resolve(undefined);
      });
      const { result } = await setup();

      await act(async () => {
        result.current.reloadHistory();
        await Promise.resolve();
      });

      for (const r of result.current.results) {
        expect(r.highlighted).toBeNull();
      }
    });
  });

  describe("folder name search", () => {
    const folder = makeFolder(10, "WorkStuff");

    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_history") {
          return Promise.resolve([
            { ...makeItem(1, false), text: "hello world", folder_id: 10 },
            { ...makeItem(2, false), text: "unrelated content", folder_id: null },
          ]);
        }
        return Promise.resolve(undefined);
      });
    });

    it("includes an item when the query matches its folder name", async () => {
      const { result } = await setup("WorkStuff", [folder]);
      const ids = result.current.results.map((r) => r.item.id);
      expect(ids).toContain(1);
    });

    it("sets highlighted to null when the match is on folder name only (not item text)", async () => {
      const { result } = await setup("WorkStuff", [folder]);
      const r = result.current.results.find((r) => r.item.id === 1);
      expect(r).toBeDefined();
      expect(r!.highlighted).toBeNull();
    });

    it("sets highlighted to non-null when query matches item text (text match takes priority over folder name)", async () => {
      const { result } = await setup("hello", [folder]);
      const r = result.current.results.find((r) => r.item.id === 1);
      expect(r).toBeDefined();
      expect(r!.highlighted).not.toBeNull();
    });

    it("excludes an item when the query matches neither its text nor its folder name", async () => {
      const { result } = await setup("zzznomatch", [folder]);
      const ids = result.current.results.map((r) => r.item.id);
      expect(ids).not.toContain(1);
      expect(ids).not.toContain(2);
    });

    it("populates folder_name on all results (including empty-query path) for items with a folder_id", async () => {
      const { result } = await setup("", [folder]);
      const withFolder = result.current.results.find((r) => r.item.id === 1);
      const withoutFolder = result.current.results.find((r) => r.item.id === 2);
      expect(withFolder?.folder_name).toBe("WorkStuff");
      expect(withoutFolder?.folder_name).toBeNull();
    });
  });

  describe("image filename search", () => {
    function makeImageItem(id: number, imagePath: string): ClipboardItem {
      return {
        ...makeItem(id),
        kind: "image",
        text: null,
        image_path: imagePath,
      };
    }

    it("includes an image item when the query matches its filename", async () => {
      const imageItem = makeImageItem(99, "screenshot.png");
      const { result } = await setup("screenshot", [], [imageItem]);
      expect(result.current.results.some((r) => r.item.id === 99)).toBe(true);
    });

    it("excludes an image item when the query does not match its filename", async () => {
      const imageItem = makeImageItem(99, "screenshot.png");
      const { result } = await setup("invoice", [], [imageItem]);
      expect(result.current.results.some((r) => r.item.id === 99)).toBe(false);
    });

    it("sets highlighted to null for image filename matches (no text to highlight)", async () => {
      const imageItem = makeImageItem(99, "screenshot.png");
      const { result } = await setup("screenshot", [], [imageItem]);
      const match = result.current.results.find((r) => r.item.id === 99);
      expect(match?.highlighted).toBeNull();
    });
  });
});
