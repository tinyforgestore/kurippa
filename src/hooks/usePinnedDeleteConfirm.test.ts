import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePinnedDeleteConfirm } from "@/hooks/usePinnedDeleteConfirm";

function fireKey(key: string) {
  act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
}

describe("usePinnedDeleteConfirm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("initial highlighted action is delete", () => {
    const { result } = renderHook(() =>
      usePinnedDeleteConfirm(vi.fn(), vi.fn(), vi.fn()),
    );
    expect(result.current.highlightedAction).toBe("delete");
  });

  it("ArrowDown toggles highlight to unpin", () => {
    const { result } = renderHook(() =>
      usePinnedDeleteConfirm(vi.fn(), vi.fn(), vi.fn()),
    );
    fireKey("ArrowDown");
    expect(result.current.highlightedAction).toBe("unpin");
  });

  it("ArrowDown twice toggles back to delete", () => {
    const { result } = renderHook(() =>
      usePinnedDeleteConfirm(vi.fn(), vi.fn(), vi.fn()),
    );
    fireKey("ArrowDown");
    fireKey("ArrowDown");
    expect(result.current.highlightedAction).toBe("delete");
  });

  it("ArrowUp toggles highlight too", () => {
    const { result } = renderHook(() =>
      usePinnedDeleteConfirm(vi.fn(), vi.fn(), vi.fn()),
    );
    fireKey("ArrowUp");
    expect(result.current.highlightedAction).toBe("unpin");
    fireKey("ArrowUp");
    expect(result.current.highlightedAction).toBe("delete");
  });

  it("Enter with delete highlighted calls onConfirm", () => {
    const onConfirm = vi.fn();
    const onUnpinAll = vi.fn();
    const onCancel = vi.fn();
    renderHook(() => usePinnedDeleteConfirm(onConfirm, onUnpinAll, onCancel));
    fireKey("Enter");
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onUnpinAll).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("Enter with unpin highlighted calls onUnpinAll", () => {
    const onConfirm = vi.fn();
    const onUnpinAll = vi.fn();
    const onCancel = vi.fn();
    renderHook(() => usePinnedDeleteConfirm(onConfirm, onUnpinAll, onCancel));
    fireKey("ArrowDown");
    fireKey("Enter");
    expect(onUnpinAll).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("y calls onConfirm", () => {
    const onConfirm = vi.fn();
    const onUnpinAll = vi.fn();
    const onCancel = vi.fn();
    renderHook(() => usePinnedDeleteConfirm(onConfirm, onUnpinAll, onCancel));
    fireKey("y");
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("Y calls onConfirm regardless of highlight", () => {
    const onConfirm = vi.fn();
    const onUnpinAll = vi.fn();
    const onCancel = vi.fn();
    renderHook(() => usePinnedDeleteConfirm(onConfirm, onUnpinAll, onCancel));
    fireKey("ArrowDown");
    fireKey("Y");
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onUnpinAll).not.toHaveBeenCalled();
  });

  it("u calls onUnpinAll", () => {
    const onConfirm = vi.fn();
    const onUnpinAll = vi.fn();
    const onCancel = vi.fn();
    renderHook(() => usePinnedDeleteConfirm(onConfirm, onUnpinAll, onCancel));
    fireKey("u");
    expect(onUnpinAll).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("U calls onUnpinAll regardless of highlight", () => {
    const onConfirm = vi.fn();
    const onUnpinAll = vi.fn();
    const onCancel = vi.fn();
    renderHook(() => usePinnedDeleteConfirm(onConfirm, onUnpinAll, onCancel));
    fireKey("U");
    expect(onUnpinAll).toHaveBeenCalledOnce();
  });

  it("Escape calls onCancel", () => {
    const onConfirm = vi.fn();
    const onUnpinAll = vi.fn();
    const onCancel = vi.fn();
    renderHook(() => usePinnedDeleteConfirm(onConfirm, onUnpinAll, onCancel));
    fireKey("Escape");
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onUnpinAll).not.toHaveBeenCalled();
  });

  it("other keys call no callback", () => {
    const onConfirm = vi.fn();
    const onUnpinAll = vi.fn();
    const onCancel = vi.fn();
    renderHook(() => usePinnedDeleteConfirm(onConfirm, onUnpinAll, onCancel));
    fireKey("n");
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onUnpinAll).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("cleans up keydown listener on unmount", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() =>
      usePinnedDeleteConfirm(vi.fn(), vi.fn(), vi.fn()),
    );
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    removeSpy.mockRestore();
  });
});
