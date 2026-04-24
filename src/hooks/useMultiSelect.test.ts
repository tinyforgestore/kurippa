import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { createStore, Provider } from "jotai";
import { useMultiSelect } from "@/hooks/useMultiSelect";

function makeWrapper() {
  const store = createStore();
  return { wrapper: ({ children }: { children: React.ReactNode }) => createElement(Provider, { store }, children) };
}

describe("useMultiSelect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("starts inactive with empty selections", () => {
      const { result } = renderHook(() => useMultiSelect(), makeWrapper());
      expect(result.current.active).toBe(false);
      expect(result.current.selections).toEqual([]);
      expect(result.current.flashingId).toBeNull();
      expect(result.current.maxToastVisible).toBe(false);
    });
  });

  describe("enterMode", () => {
    it("sets active to true and seeds selections with the initial item id", () => {
      const { result } = renderHook(() => useMultiSelect(), makeWrapper());
      act(() => {
        result.current.enterMode(42);
      });
      expect(result.current.active).toBe(true);
      expect(result.current.selections).toEqual([42]);
    });

    it("resets any prior flash/toast state", () => {
      const { result } = renderHook(() => useMultiSelect(), makeWrapper());
      // Trigger max toast first
      act(() => {
        result.current.enterMode(1);
      });
      act(() => {
        result.current.toggleSelection(2, true);
        result.current.toggleSelection(3, true);
        result.current.toggleSelection(4, true);
        result.current.toggleSelection(5, true);
      });
      act(() => {
        result.current.toggleSelection(6, true); // triggers flash/toast
      });
      expect(result.current.maxToastVisible).toBe(true);
      act(() => {
        result.current.enterMode(10);
      });
      expect(result.current.flashingId).toBeNull();
      expect(result.current.maxToastVisible).toBe(false);
    });
  });

  describe("exitMode", () => {
    it("sets active to false and clears selections", () => {
      const { result } = renderHook(() => useMultiSelect(), makeWrapper());
      act(() => {
        result.current.enterMode(42);
      });
      act(() => {
        result.current.exitMode();
      });
      expect(result.current.active).toBe(false);
      expect(result.current.selections).toEqual([]);
    });

    it("clears flash and toast state on exit", () => {
      const { result } = renderHook(() => useMultiSelect(), makeWrapper());
      act(() => {
        result.current.enterMode(1);
        result.current.toggleSelection(2, true);
        result.current.toggleSelection(3, true);
        result.current.toggleSelection(4, true);
        result.current.toggleSelection(5, true);
      });
      act(() => {
        result.current.toggleSelection(6, true); // triggers flash/toast
      });
      expect(result.current.maxToastVisible).toBe(true);
      act(() => {
        result.current.exitMode();
      });
      expect(result.current.flashingId).toBeNull();
      expect(result.current.maxToastVisible).toBe(false);
    });
  });

  describe("toggleSelection", () => {
    it("does nothing when isSelectable is false", () => {
      const { result } = renderHook(() => useMultiSelect(), makeWrapper());
      act(() => {
        result.current.enterMode(1);
      });
      act(() => {
        result.current.toggleSelection(99, false);
      });
      expect(result.current.selections).toEqual([1]);
    });

    it("adds an item to selections when it is not yet selected", () => {
      const { result } = renderHook(() => useMultiSelect(), makeWrapper());
      act(() => {
        result.current.enterMode(1);
      });
      act(() => {
        result.current.toggleSelection(2, true);
      });
      expect(result.current.selections).toEqual([1, 2]);
    });

    it("removes an item from selections when it is already selected", () => {
      const { result } = renderHook(() => useMultiSelect(), makeWrapper());
      act(() => {
        result.current.enterMode(1);
      });
      act(() => {
        result.current.toggleSelection(2, true);
        result.current.toggleSelection(3, true);
      });
      act(() => {
        result.current.toggleSelection(2, true); // deselect
      });
      expect(result.current.selections).toEqual([1, 3]);
    });

    it("preserves selection order (append to end)", () => {
      const { result } = renderHook(() => useMultiSelect(), makeWrapper());
      act(() => {
        result.current.enterMode(10);
      });
      act(() => {
        result.current.toggleSelection(20, true);
        result.current.toggleSelection(30, true);
      });
      expect(result.current.selections).toEqual([10, 20, 30]);
    });

    describe("max-5 enforcement", () => {
      it("does not allow a 6th selection", () => {
        const { result } = renderHook(() => useMultiSelect(), makeWrapper());
        act(() => {
          result.current.enterMode(1);
          result.current.toggleSelection(2, true);
          result.current.toggleSelection(3, true);
          result.current.toggleSelection(4, true);
          result.current.toggleSelection(5, true);
        });
        expect(result.current.selections).toHaveLength(5);
        act(() => {
          result.current.toggleSelection(6, true);
        });
        expect(result.current.selections).toHaveLength(5);
        expect(result.current.selections).not.toContain(6);
      });

      it("sets flashingId to the 6th item and clears it after 150ms", () => {
        const { result } = renderHook(() => useMultiSelect(), makeWrapper());
        act(() => {
          result.current.enterMode(1);
          result.current.toggleSelection(2, true);
          result.current.toggleSelection(3, true);
          result.current.toggleSelection(4, true);
          result.current.toggleSelection(5, true);
        });
        act(() => {
          result.current.toggleSelection(6, true);
        });
        expect(result.current.flashingId).toBe(6);
        act(() => {
          vi.advanceTimersByTime(150);
        });
        expect(result.current.flashingId).toBeNull();
      });

      it("shows maxToastVisible for 1500ms then hides it", () => {
        const { result } = renderHook(() => useMultiSelect(), makeWrapper());
        act(() => {
          result.current.enterMode(1);
          result.current.toggleSelection(2, true);
          result.current.toggleSelection(3, true);
          result.current.toggleSelection(4, true);
          result.current.toggleSelection(5, true);
        });
        act(() => {
          result.current.toggleSelection(6, true);
        });
        expect(result.current.maxToastVisible).toBe(true);
        act(() => {
          vi.advanceTimersByTime(1499);
        });
        expect(result.current.maxToastVisible).toBe(true);
        act(() => {
          vi.advanceTimersByTime(1);
        });
        expect(result.current.maxToastVisible).toBe(false);
      });

      it("allows adding after deselecting to go below 5", () => {
        const { result } = renderHook(() => useMultiSelect(), makeWrapper());
        act(() => {
          result.current.enterMode(1);
          result.current.toggleSelection(2, true);
          result.current.toggleSelection(3, true);
          result.current.toggleSelection(4, true);
          result.current.toggleSelection(5, true);
        });
        act(() => {
          result.current.toggleSelection(1, true); // deselect
        });
        act(() => {
          result.current.toggleSelection(6, true); // now OK
        });
        expect(result.current.selections).toHaveLength(5);
        expect(result.current.selections).toContain(6);
        expect(result.current.flashingId).toBeNull();
        expect(result.current.maxToastVisible).toBe(false);
      });
    });
  });
});
