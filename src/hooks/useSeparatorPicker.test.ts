import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSeparatorPicker } from "@/hooks/useSeparatorPicker";

function fireKey(key: string, modifiers: Partial<KeyboardEventInit> = {}) {
  document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...modifiers }));
}

describe("useSeparatorPicker", () => {
  beforeEach(() => vi.clearAllMocks());

  it('defaultSeparator "newline" → initial cursor 0', () => {
    const { result } = renderHook(() => useSeparatorPicker("newline", vi.fn(), vi.fn()));
    expect(result.current.cursor).toBe(0);
  });

  it('defaultSeparator "space" → initial cursor 1', () => {
    const { result } = renderHook(() => useSeparatorPicker("space", vi.fn(), vi.fn()));
    expect(result.current.cursor).toBe(1);
  });

  it('defaultSeparator "comma" → initial cursor 2', () => {
    const { result } = renderHook(() => useSeparatorPicker("comma", vi.fn(), vi.fn()));
    expect(result.current.cursor).toBe(2);
  });

  it("ArrowDown increments cursor, capped at 2", () => {
    const { result } = renderHook(() => useSeparatorPicker("newline", vi.fn(), vi.fn()));
    act(() => fireKey("ArrowDown"));
    expect(result.current.cursor).toBe(1);
    act(() => fireKey("ArrowDown"));
    expect(result.current.cursor).toBe(2);
    act(() => fireKey("ArrowDown"));
    expect(result.current.cursor).toBe(2);
  });

  it("ArrowUp decrements cursor, capped at 0", () => {
    const { result } = renderHook(() => useSeparatorPicker("comma", vi.fn(), vi.fn()));
    act(() => fireKey("ArrowUp"));
    expect(result.current.cursor).toBe(1);
    act(() => fireKey("ArrowUp"));
    expect(result.current.cursor).toBe(0);
    act(() => fireKey("ArrowUp"));
    expect(result.current.cursor).toBe(0);
  });

  it("Enter calls onConfirm with current separator value", () => {
    const onConfirm = vi.fn();
    renderHook(() => useSeparatorPicker("space", onConfirm, vi.fn()));
    act(() => fireKey("Enter"));
    expect(onConfirm).toHaveBeenCalledWith("space");
  });

  it('key "1" calls onConfirm("newline")', () => {
    const onConfirm = vi.fn();
    renderHook(() => useSeparatorPicker("newline", onConfirm, vi.fn()));
    act(() => fireKey("1"));
    expect(onConfirm).toHaveBeenCalledWith("newline");
  });

  it('key "2" calls onConfirm("space")', () => {
    const onConfirm = vi.fn();
    renderHook(() => useSeparatorPicker("newline", onConfirm, vi.fn()));
    act(() => fireKey("2"));
    expect(onConfirm).toHaveBeenCalledWith("space");
  });

  it('key "3" calls onConfirm("comma")', () => {
    const onConfirm = vi.fn();
    renderHook(() => useSeparatorPicker("newline", onConfirm, vi.fn()));
    act(() => fireKey("3"));
    expect(onConfirm).toHaveBeenCalledWith("comma");
  });

  it("Escape calls onCancel", () => {
    const onCancel = vi.fn();
    renderHook(() => useSeparatorPicker("newline", vi.fn(), onCancel));
    act(() => fireKey("Escape"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("ArrowLeft calls onCancel", () => {
    const onCancel = vi.fn();
    renderHook(() => useSeparatorPicker("newline", vi.fn(), onCancel));
    act(() => fireKey("ArrowLeft"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('"4" and other non-1-3 digit keys do nothing', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderHook(() => useSeparatorPicker("newline", onConfirm, onCancel));
    act(() => fireKey("4"));
    act(() => fireKey("0"));
    act(() => fireKey("a"));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
