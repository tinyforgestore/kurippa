import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import {
  ClipboardStoreContext,
  ClipboardStore,
  useClipboardStore,
} from "@/store/clipboard";
import { ClipboardItem, FuzzyResult, ListEntry } from "@/types";

const makeItem = (id: number): ClipboardItem => ({
  id,
  kind: "text",
  text: `item-${id}`,
  html: null,
  rtf: null,
  image_path: null,
  source_app: null,
  created_at: 0,
  pinned: false,
  folder_id: null,
  qr_text: null,
  image_width: null,
  image_height: null,
});

const makeFuzzyResult = (id: number): FuzzyResult => ({
  item: makeItem(id),
  highlighted: null,
  score: 1,
  folder_name: null,
});

describe("ClipboardStoreContext — default value", () => {
  it("exposes empty arrays and null ids", () => {
    const { result } = renderHook(() => useClipboardStore());
    expect(result.current.allItems).toEqual([]);
    expect(result.current.results).toEqual([]);
    expect(result.current.visibleEntries).toEqual([]);
    expect(result.current.liftingId).toBeNull();
    expect(result.current.landingId).toBeNull();
    expect(result.current.deletingId).toBeNull();
  });
});

describe("useClipboardStore — reads from context", () => {
  it("returns values provided by a plain context provider", () => {
    const item = makeItem(42);
    const result = makeFuzzyResult(42);
    const entry: ListEntry = { kind: "item", result };

    const customValue: ClipboardStore = {
      allItems: [item],
      results: [result],
      visibleEntries: [entry],
      liftingId: 42,
      landingId: 7,
      deletingId: 3,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(ClipboardStoreContext.Provider, { value: customValue }, children);

    const { result: hookResult } = renderHook(() => useClipboardStore(), { wrapper });

    expect(hookResult.current.allItems).toEqual([item]);
    expect(hookResult.current.results).toEqual([result]);
    expect(hookResult.current.visibleEntries).toEqual([entry]);
    expect(hookResult.current.liftingId).toBe(42);
    expect(hookResult.current.landingId).toBe(7);
    expect(hookResult.current.deletingId).toBe(3);
  });

  it("reflects null ids when not set", () => {
    const customValue: ClipboardStore = {
      allItems: [],
      results: [],
      visibleEntries: [],
      liftingId: null,
      landingId: null,
      deletingId: null,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(ClipboardStoreContext.Provider, { value: customValue }, children);

    const { result } = renderHook(() => useClipboardStore(), { wrapper });

    expect(result.current.liftingId).toBeNull();
    expect(result.current.landingId).toBeNull();
    expect(result.current.deletingId).toBeNull();
  });
});
