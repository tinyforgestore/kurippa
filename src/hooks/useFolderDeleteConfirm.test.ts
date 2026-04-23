import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useFolderDeleteConfirm } from "@/hooks/useFolderDeleteConfirm";

function fireKey(key: string) {
  document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

describe("useFolderDeleteConfirm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Enter calls onConfirm", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderHook(() => useFolderDeleteConfirm(onConfirm, onCancel));
    fireKey("Enter");
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("y calls onConfirm", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderHook(() => useFolderDeleteConfirm(onConfirm, onCancel));
    fireKey("y");
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("Y calls onConfirm", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderHook(() => useFolderDeleteConfirm(onConfirm, onCancel));
    fireKey("Y");
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("Escape calls onCancel", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderHook(() => useFolderDeleteConfirm(onConfirm, onCancel));
    fireKey("Escape");
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("other keys call neither callback", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderHook(() => useFolderDeleteConfirm(onConfirm, onCancel));
    fireKey("n");
    fireKey("Space");
    fireKey("ArrowDown");
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
