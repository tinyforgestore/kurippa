import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import {
  MultiSelectStoreContext,
  MultiSelectStore,
  useMultiSelectStore,
} from "@/store/multiSelect";

describe("MultiSelectStoreContext — default value", () => {
  it("exposes inactive state, empty selections, null flashingId, hidden toast", () => {
    const { result } = renderHook(() => useMultiSelectStore());
    expect(result.current.active).toBe(false);
    expect(result.current.selections).toEqual([]);
    expect(result.current.flashingId).toBeNull();
    expect(result.current.maxToastVisible).toBe(false);
  });
});

describe("useMultiSelectStore — reads from context", () => {
  it("returns active state and selections from context", () => {
    const customValue: MultiSelectStore = {
      active: true,
      selections: [1, 2, 3],
      flashingId: null,
      maxToastVisible: false,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(MultiSelectStoreContext.Provider, { value: customValue }, children);

    const { result } = renderHook(() => useMultiSelectStore(), { wrapper });

    expect(result.current.active).toBe(true);
    expect(result.current.selections).toEqual([1, 2, 3]);
  });

  it("returns flashingId and maxToastVisible when set", () => {
    const customValue: MultiSelectStore = {
      active: true,
      selections: [5],
      flashingId: 5,
      maxToastVisible: true,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(MultiSelectStoreContext.Provider, { value: customValue }, children);

    const { result } = renderHook(() => useMultiSelectStore(), { wrapper });

    expect(result.current.flashingId).toBe(5);
    expect(result.current.maxToastVisible).toBe(true);
  });

  it("returns empty selections when not active", () => {
    const customValue: MultiSelectStore = {
      active: false,
      selections: [],
      flashingId: null,
      maxToastVisible: false,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(MultiSelectStoreContext.Provider, { value: customValue }, children);

    const { result } = renderHook(() => useMultiSelectStore(), { wrapper });

    expect(result.current.active).toBe(false);
    expect(result.current.selections).toHaveLength(0);
  });
});
