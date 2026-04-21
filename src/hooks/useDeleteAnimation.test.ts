import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDeleteAnimation } from "@/hooks/useDeleteAnimation";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn().mockResolvedValue(undefined),
  error: vi.fn().mockResolvedValue(undefined),
  warn: vi.fn().mockResolvedValue(undefined),
  debug: vi.fn().mockResolvedValue(undefined),
  trace: vi.fn().mockResolvedValue(undefined),
}));

describe("useDeleteAnimation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("delete (⌘Backspace / Ctrl+Backspace)", () => {
    it("calls onDelete with item id when triggerDelete is called", () => {
      const onDelete = vi.fn();
      const setSelectedIndex = vi.fn();
      const getEntriesLength = vi.fn().mockReturnValue(2);

      const { result } = renderHook(() =>
        useDeleteAnimation(onDelete, setSelectedIndex, getEntriesLength)
      );

      act(() => {
        result.current.triggerDelete(10);
        vi.runAllTimers();
      });
      expect(onDelete).toHaveBeenCalledWith(10);
    });

    it("calls onDelete with the correct id for different items", () => {
      const onDelete = vi.fn();
      const setSelectedIndex = vi.fn();
      const getEntriesLength = vi.fn().mockReturnValue(1);

      const { result } = renderHook(() =>
        useDeleteAnimation(onDelete, setSelectedIndex, getEntriesLength)
      );

      act(() => {
        result.current.triggerDelete(55);
        vi.runAllTimers();
      });
      expect(onDelete).toHaveBeenCalledWith(55);
    });

    it("clamps selectedIndex after delete when index would exceed new length", () => {
      const onDelete = vi.fn();
      const setSelectedIndex = vi.fn();
      // 3 items → after delete, new length is effectively 2 (indexes 0 and 1)
      const getEntriesLength = vi.fn().mockReturnValue(3);

      const { result } = renderHook(() =>
        useDeleteAnimation(onDelete, setSelectedIndex, getEntriesLength)
      );

      act(() => {
        result.current.triggerDelete(3);
        vi.runAllTimers();
      });

      expect(onDelete).toHaveBeenCalledWith(3);
      // setSelectedIndex called with updater fn; call it with i=2 to verify clamping
      const updater = setSelectedIndex.mock.calls[0][0] as (i: number) => number;
      // With length=3, clamp is Math.min(i, 3-2) = Math.min(2, 1) = 1
      expect(updater(2)).toBe(1);
    });

    it("sets deletingId immediately but defers onDelete until after DELETE_DURATION_MS", () => {
      const onDelete = vi.fn();
      const setSelectedIndex = vi.fn();
      const getEntriesLength = vi.fn().mockReturnValue(2);

      const { result } = renderHook(() =>
        useDeleteAnimation(onDelete, setSelectedIndex, getEntriesLength)
      );

      act(() => {
        result.current.triggerDelete(10);
      });
      // Before timer fires: deletingId is set, onDelete not yet called
      expect(result.current.deletingId).toBe(10);
      expect(onDelete).not.toHaveBeenCalled();

      act(() => {
        vi.runAllTimers();
      });
      // After timer fires: onDelete called, deletingId reset
      expect(onDelete).toHaveBeenCalledWith(10);
      expect(result.current.deletingId).toBeNull();
    });

    it("ignores a second triggerDelete call while deletingId is set (debounce via timer reset)", () => {
      const onDelete = vi.fn();
      const setSelectedIndex = vi.fn();
      const getEntriesLength = vi.fn().mockReturnValue(2);

      const { result } = renderHook(() =>
        useDeleteAnimation(onDelete, setSelectedIndex, getEntriesLength)
      );

      // First call — starts the animation
      act(() => {
        result.current.triggerDelete(10);
      });
      expect(result.current.deletingId).toBe(10);

      // Second call while deletingId is still set — resets timer but same id
      act(() => {
        result.current.triggerDelete(10);
      });

      act(() => {
        vi.runAllTimers();
      });
      // onDelete should only have been called once
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe("delete — single-item list clamp", () => {
    it("clamps selectedIndex to 0 (not -1) when deleting the only item", () => {
      const onDelete = vi.fn();
      const setSelectedIndex = vi.fn();
      // Only 1 item in the list
      const getEntriesLength = vi.fn().mockReturnValue(1);

      const { result } = renderHook(() =>
        useDeleteAnimation(onDelete, setSelectedIndex, getEntriesLength)
      );

      act(() => {
        result.current.triggerDelete(99);
        vi.runAllTimers();
      });

      expect(onDelete).toHaveBeenCalledWith(99);
      // setSelectedIndex called with updater fn; verify it clamps to 0, not -1
      const updater = setSelectedIndex.mock.calls[0][0] as (i: number) => number;
      // Math.max(0, Math.min(0, 1-2)) = Math.max(0, Math.min(0, -1)) = Math.max(0, -1) = 0
      expect(updater(0)).toBe(0);
    });
  });
});
