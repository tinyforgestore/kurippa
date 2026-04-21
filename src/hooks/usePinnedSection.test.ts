import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { usePinnedSection } from "@/hooks/usePinnedSection";
import { FuzzyResult } from "@/types";

function makeFuzzyResult(id: number, pinned: boolean): FuzzyResult {
  return {
    item: {
      id,
      kind: "text",
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
    },
    highlighted: `item-${id}`,
    score: 0,
    folder_name: null,
  };
}

describe("usePinnedSection", () => {
  describe("0 pins", () => {
    it("returns all unpinned items as kind=item entries", () => {
      const results = [makeFuzzyResult(1, false), makeFuzzyResult(2, false)];
      const { result } = renderHook(() => usePinnedSection(results));

      expect(result.current.visibleEntries).toHaveLength(2);
      expect(result.current.visibleEntries[0]).toMatchObject({ kind: "item" });
      expect(result.current.visibleEntries[1]).toMatchObject({ kind: "item" });
    });

    it("does not include a pinned-header entry", () => {
      const results = [makeFuzzyResult(1, false)];
      const { result } = renderHook(() => usePinnedSection(results));

      const hasHeader = result.current.visibleEntries.some(
        (e) => e.kind === "pinned-header"
      );
      expect(hasHeader).toBe(false);
    });
  });

  describe("1 pin", () => {
    it("puts the pinned item first followed by unpinned items", () => {
      const results = [
        makeFuzzyResult(1, false),
        makeFuzzyResult(2, true),
        makeFuzzyResult(3, false),
      ];
      const { result } = renderHook(() => usePinnedSection(results));

      const entries = result.current.visibleEntries;
      expect(entries).toHaveLength(3);
      expect(entries[0].kind).toBe("item");
      expect((entries[0] as { kind: "item"; result: FuzzyResult }).result.item.id).toBe(2);
      expect(entries[1].kind).toBe("item");
      expect(entries[2].kind).toBe("item");
    });

    it("does not include a pinned-header entry for a single pin", () => {
      const results = [makeFuzzyResult(1, true), makeFuzzyResult(2, false)];
      const { result } = renderHook(() => usePinnedSection(results));

      const hasHeader = result.current.visibleEntries.some(
        (e) => e.kind === "pinned-header"
      );
      expect(hasHeader).toBe(false);
    });
  });

  describe("2+ pins (always collapsed)", () => {
    it("shows pinned-header with correct count and unpinned items only", () => {
      const results = [
        makeFuzzyResult(1, true),
        makeFuzzyResult(2, true),
        makeFuzzyResult(3, false),
      ];
      const { result } = renderHook(() => usePinnedSection(results));

      const entries = result.current.visibleEntries;
      expect(entries[0].kind).toBe("pinned-header");
      expect((entries[0] as { kind: "pinned-header"; count: number }).count).toBe(2);
      expect(entries).toHaveLength(2); // header + 1 unpinned
      expect(entries[1].kind).toBe("item");
      expect((entries[1] as { kind: "item"; result: FuzzyResult }).result.item.id).toBe(3);
    });

    it("inPinnedSection is false by default", () => {
      const results = [makeFuzzyResult(1, true), makeFuzzyResult(2, true)];
      const { result } = renderHook(() => usePinnedSection(results));

      expect(result.current.inPinnedSection).toBe(false);
    });

    it("never shows pinned items inline (no expanded state)", () => {
      const results = [
        makeFuzzyResult(1, true),
        makeFuzzyResult(2, true),
        makeFuzzyResult(3, false),
      ];
      const { result } = renderHook(() => usePinnedSection(results));

      // Even without calling any toggle, the view stays collapsed
      const entries = result.current.visibleEntries;
      const pinnedItemEntries = entries.filter(
        (e) => e.kind === "item" && (e as { kind: "item"; result: FuzzyResult }).result.item.pinned
      );
      expect(pinnedItemEntries).toHaveLength(0);
    });
  });

  describe("drill-down: enterPinnedSection", () => {
    it("sets inPinnedSection to true", () => {
      const results = [makeFuzzyResult(1, true), makeFuzzyResult(2, true)];
      const { result } = renderHook(() => usePinnedSection(results));

      expect(result.current.inPinnedSection).toBe(false);
      act(() => {
        result.current.enterPinnedSection();
      });
      expect(result.current.inPinnedSection).toBe(true);
    });

    it("visibleEntries shows only pinned items when inPinnedSection is true", () => {
      const results = [
        makeFuzzyResult(1, true),
        makeFuzzyResult(2, true),
        makeFuzzyResult(3, false),
      ];
      const { result } = renderHook(() => usePinnedSection(results));

      act(() => {
        result.current.enterPinnedSection();
      });

      const entries = result.current.visibleEntries;
      expect(entries).toHaveLength(2);
      expect(entries[0].kind).toBe("item");
      expect((entries[0] as { kind: "item"; result: FuzzyResult }).result.item.pinned).toBe(true);
      expect(entries[1].kind).toBe("item");
      expect((entries[1] as { kind: "item"; result: FuzzyResult }).result.item.pinned).toBe(true);
    });

    it("no header is shown when inPinnedSection is true", () => {
      const results = [makeFuzzyResult(1, true), makeFuzzyResult(2, true)];
      const { result } = renderHook(() => usePinnedSection(results));

      act(() => {
        result.current.enterPinnedSection();
      });

      const hasHeader = result.current.visibleEntries.some((e) => e.kind === "pinned-header");
      expect(hasHeader).toBe(false);
    });
  });

  describe("drill-down: exitPinnedSection", () => {
    it("sets inPinnedSection back to false", () => {
      const results = [makeFuzzyResult(1, true), makeFuzzyResult(2, true)];
      const { result } = renderHook(() => usePinnedSection(results));

      act(() => {
        result.current.enterPinnedSection();
      });
      expect(result.current.inPinnedSection).toBe(true);

      act(() => {
        result.current.exitPinnedSection();
      });
      expect(result.current.inPinnedSection).toBe(false);
    });

    it("returns to main view (header + unpinned) after exit", () => {
      const results = [
        makeFuzzyResult(1, true),
        makeFuzzyResult(2, true),
        makeFuzzyResult(3, false),
      ];
      const { result } = renderHook(() => usePinnedSection(results));

      act(() => {
        result.current.enterPinnedSection();
      });
      act(() => {
        result.current.exitPinnedSection();
      });

      const entries = result.current.visibleEntries;
      expect(entries).toHaveLength(2); // header + 1 unpinned
      expect(entries[0].kind).toBe("pinned-header");
      expect(entries[1].kind).toBe("item");
      expect((entries[1] as { kind: "item"; result: FuzzyResult }).result.item.pinned).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("0 results → empty visibleEntries", () => {
      const { result } = renderHook(() => usePinnedSection([]));
      expect(result.current.visibleEntries).toHaveLength(0);
    });

    it("1 pin + 0 unpinned → single-item list with the pinned item", () => {
      const results = [makeFuzzyResult(5, true)];
      const { result } = renderHook(() => usePinnedSection(results));

      const entries = result.current.visibleEntries;
      expect(entries).toHaveLength(1);
      expect(entries[0].kind).toBe("item");
      expect((entries[0] as { kind: "item"; result: FuzzyResult }).result.item.id).toBe(5);
      expect((entries[0] as { kind: "item"; result: FuzzyResult }).result.item.pinned).toBe(true);
    });

    it("enterPinnedSection with 0 pinned items → empty visibleEntries", () => {
      const results = [makeFuzzyResult(1, false), makeFuzzyResult(2, false)];
      const { result } = renderHook(() => usePinnedSection(results));

      act(() => {
        result.current.enterPinnedSection();
      });

      expect(result.current.visibleEntries).toHaveLength(0);
    });
  });

  describe("auto-exit when pinned items removed", () => {
    it("sets inPinnedSection to false and shows unpinned items when all pins are removed while in pinned section", () => {
      const initialResults = [
        makeFuzzyResult(1, true),
        makeFuzzyResult(2, true),
        makeFuzzyResult(3, false),
      ];
      const { result, rerender } = renderHook(
        (props: { results: ReturnType<typeof makeFuzzyResult>[] }) =>
          usePinnedSection(props.results),
        { initialProps: { results: initialResults } }
      );

      // Enter the pinned section
      act(() => {
        result.current.enterPinnedSection();
      });
      expect(result.current.inPinnedSection).toBe(true);

      // Remove all pinned items
      const unpinnedOnly = [makeFuzzyResult(3, false)];
      act(() => {
        rerender({ results: unpinnedOnly });
      });

      // Should auto-exit the pinned section
      expect(result.current.inPinnedSection).toBe(false);
      // visibleEntries should now show only the unpinned item
      expect(result.current.visibleEntries).toHaveLength(1);
      expect(result.current.visibleEntries[0].kind).toBe("item");
      expect(
        (result.current.visibleEntries[0] as { kind: "item"; result: FuzzyResult }).result.item.id
      ).toBe(3);
    });
  });

  describe("filtering correctness", () => {
    it("correctly separates pinned and unpinned items when in pinned section", () => {
      const results = [
        makeFuzzyResult(1, false),
        makeFuzzyResult(2, true),
        makeFuzzyResult(3, false),
        makeFuzzyResult(4, true),
        makeFuzzyResult(5, false),
      ];
      const { result } = renderHook(() => usePinnedSection(results));

      act(() => {
        result.current.enterPinnedSection();
      });

      const entries = result.current.visibleEntries;
      // Only the 2 pinned items
      expect(entries).toHaveLength(2);
      expect(entries[0].kind).toBe("item");
      expect((entries[0] as { kind: "item"; result: FuzzyResult }).result.item.pinned).toBe(true);
      expect(entries[1].kind).toBe("item");
      expect((entries[1] as { kind: "item"; result: FuzzyResult }).result.item.pinned).toBe(true);
    });

    it("main view shows header count correctly for 5 pinned items", () => {
      const results = [
        makeFuzzyResult(1, true),
        makeFuzzyResult(2, true),
        makeFuzzyResult(3, true),
        makeFuzzyResult(4, true),
        makeFuzzyResult(5, true),
        makeFuzzyResult(6, false),
      ];
      const { result } = renderHook(() => usePinnedSection(results));

      const entries = result.current.visibleEntries;
      expect(entries[0].kind).toBe("pinned-header");
      expect((entries[0] as { kind: "pinned-header"; count: number }).count).toBe(5);
      // header + 1 unpinned
      expect(entries).toHaveLength(2);
    });
  });
});
