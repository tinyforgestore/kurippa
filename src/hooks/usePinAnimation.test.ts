import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useRef } from "react";
import { usePinAnimation } from "@/hooks/usePinAnimation";
import { LAND_DURATION_MS, LIFT_DURATION_MS } from "@/constants/animation";

describe("usePinAnimation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(togglePinItem = vi.fn().mockResolvedValue(undefined)) {
    return renderHook(() => {
      const listRef = useRef<HTMLDivElement | null>(null);
      return { ...usePinAnimation(togglePinItem, listRef), togglePinItem };
    });
  }

  it("sets liftingId immediately on handleTogglePin call", () => {
    const { result } = setup();

    act(() => {
      result.current.handleTogglePin(42);
    });

    expect(result.current.liftingId).toBe(42);
    expect(result.current.landingId).toBeNull();
  });

  it("clears liftingId after LIFT_DURATION_MS", async () => {
    const togglePinItem = vi.fn().mockResolvedValue(undefined);
    const { result } = setup(togglePinItem);

    act(() => {
      result.current.handleTogglePin(42);
    });
    expect(result.current.liftingId).toBe(42);

    await act(async () => {
      vi.advanceTimersByTime(LIFT_DURATION_MS);
    });

    expect(result.current.liftingId).toBeNull();
  });

  it("calls togglePinItem after LIFT_DURATION_MS", async () => {
    const togglePinItem = vi.fn().mockResolvedValue(undefined);
    const { result } = setup(togglePinItem);

    act(() => {
      result.current.handleTogglePin(42);
    });
    expect(togglePinItem).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(LIFT_DURATION_MS);
    });

    expect(togglePinItem).toHaveBeenCalledOnce();
    expect(togglePinItem).toHaveBeenCalledWith(42);
  });

  it("sets landingId after toggle resolves", async () => {
    const togglePinItem = vi.fn().mockResolvedValue(undefined);
    const { result } = setup(togglePinItem);

    act(() => {
      result.current.handleTogglePin(42);
    });

    await act(async () => {
      vi.advanceTimersByTime(LIFT_DURATION_MS);
    });

    expect(result.current.landingId).toBe(42);
  });

  it("clears landingId after LAND_DURATION_MS", async () => {
    const togglePinItem = vi.fn().mockResolvedValue(undefined);
    const { result } = setup(togglePinItem);

    act(() => {
      result.current.handleTogglePin(42);
    });

    await act(async () => {
      vi.advanceTimersByTime(LIFT_DURATION_MS);
    });
    expect(result.current.landingId).toBe(42);

    await act(async () => {
      vi.advanceTimersByTime(LAND_DURATION_MS);
    });

    expect(result.current.landingId).toBeNull();
  });

  it("re-trigger within LIFT_DURATION_MS cancels previous timers — no double-fire", async () => {
    const togglePinItem = vi.fn().mockResolvedValue(undefined);
    const { result } = setup(togglePinItem);

    // First trigger
    act(() => {
      result.current.handleTogglePin(1);
    });

    // Re-trigger before lift completes (50ms into 150ms lift window)
    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    act(() => {
      result.current.handleTogglePin(2);
    });

    // The first lift timer was cancelled — advancing full LIFT_DURATION_MS from reset
    await act(async () => {
      vi.advanceTimersByTime(LIFT_DURATION_MS);
    });

    // togglePinItem should only be called once (for id=2), not twice
    expect(togglePinItem).toHaveBeenCalledOnce();
    expect(togglePinItem).toHaveBeenCalledWith(2);
  });

  it("re-trigger resets liftingId to the new id", async () => {
    const { result } = setup();

    act(() => {
      result.current.handleTogglePin(1);
    });

    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    act(() => {
      result.current.handleTogglePin(2);
    });

    expect(result.current.liftingId).toBe(2);
  });
});
