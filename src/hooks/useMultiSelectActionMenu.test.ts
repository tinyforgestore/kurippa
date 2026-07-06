import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMultiSelectActionMenu } from "@/hooks/useMultiSelectActionMenu";

function fireKey(key: string) {
  act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
}

function setup() {
  const onMerge = vi.fn();
  const onPinAll = vi.fn();
  const onMoveToFolder = vi.fn();
  const onCancel = vi.fn();
  const view = renderHook(() =>
    useMultiSelectActionMenu(onMerge, onPinAll, onMoveToFolder, onCancel),
  );
  return { view, onMerge, onPinAll, onMoveToFolder, onCancel };
}

describe("useMultiSelectActionMenu", () => {
  beforeEach(() => vi.clearAllMocks());

  it("starts with 'merge' highlighted", () => {
    const { view } = setup();
    expect(view.result.current.selectedAction).toBe("merge");
  });

  it("ArrowDown cycles merge -> pin -> folder -> merge", () => {
    const { view } = setup();
    fireKey("ArrowDown");
    expect(view.result.current.selectedAction).toBe("pin");
    fireKey("ArrowDown");
    expect(view.result.current.selectedAction).toBe("folder");
    fireKey("ArrowDown");
    expect(view.result.current.selectedAction).toBe("merge");
  });

  it("ArrowUp cycles merge -> folder -> pin -> merge", () => {
    const { view } = setup();
    fireKey("ArrowUp");
    expect(view.result.current.selectedAction).toBe("folder");
    fireKey("ArrowUp");
    expect(view.result.current.selectedAction).toBe("pin");
    fireKey("ArrowUp");
    expect(view.result.current.selectedAction).toBe("merge");
  });

  it("Enter fires the handler for the highlighted action", () => {
    const { onMerge, onPinAll, onMoveToFolder } = setup();
    fireKey("ArrowDown"); // -> pin
    fireKey("Enter");
    expect(onPinAll).toHaveBeenCalledOnce();
    expect(onMerge).not.toHaveBeenCalled();
    expect(onMoveToFolder).not.toHaveBeenCalled();
  });

  it("M fires merge regardless of highlight", () => {
    const { onMerge } = setup();
    fireKey("ArrowDown"); // highlight is 'pin'
    fireKey("m");
    expect(onMerge).toHaveBeenCalledOnce();
  });

  it("P fires pin regardless of highlight", () => {
    const { onPinAll } = setup();
    fireKey("p");
    expect(onPinAll).toHaveBeenCalledOnce();
  });

  it("F fires move-to-folder regardless of highlight", () => {
    const { onMoveToFolder } = setup();
    fireKey("f");
    expect(onMoveToFolder).toHaveBeenCalledOnce();
  });

  it("Escape cancels", () => {
    const { onCancel } = setup();
    fireKey("Escape");
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("setSelectedAction updates the highlight", () => {
    const { view } = setup();
    act(() => view.result.current.setSelectedAction("folder"));
    expect(view.result.current.selectedAction).toBe("folder");
  });
});
