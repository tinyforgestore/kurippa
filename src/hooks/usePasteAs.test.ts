import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { usePasteAs } from "@/hooks/usePasteAs";
import { ClipboardItem } from "@/types";

function makeItem(id: number, text = `item-${id}`): ClipboardItem {
  return {
    id,
    kind: "text",
    text,
    html: null,
    rtf: null,
    image_path: null,
    source_app: null,
    created_at: id * 1000,
    pinned: false,
    folder_id: null,
    qr_text: null,
    image_width: null,
    image_height: null,
  };
}

describe("usePasteAs", () => {
  it("initial pasteAsItem is null", () => {
    const { result } = renderHook(() => usePasteAs());
    expect(result.current.pasteAsItem).toBeNull();
  });

  it("openPasteAs sets pasteAsItem to the given item", () => {
    const { result } = renderHook(() => usePasteAs());
    const item = makeItem(1);

    act(() => {
      result.current.openPasteAs(item);
    });

    expect(result.current.pasteAsItem).toEqual(item);
  });

  it("closePasteAs sets pasteAsItem back to null", () => {
    const { result } = renderHook(() => usePasteAs());
    const item = makeItem(2);

    act(() => {
      result.current.openPasteAs(item);
    });
    expect(result.current.pasteAsItem).toEqual(item);

    act(() => {
      result.current.closePasteAs();
    });
    expect(result.current.pasteAsItem).toBeNull();
  });

  it("calling openPasteAs with a different item replaces the previous one", () => {
    const { result } = renderHook(() => usePasteAs());
    const itemA = makeItem(10, "first");
    const itemB = makeItem(20, "second");

    act(() => {
      result.current.openPasteAs(itemA);
    });
    expect(result.current.pasteAsItem).toEqual(itemA);

    act(() => {
      result.current.openPasteAs(itemB);
    });
    expect(result.current.pasteAsItem).toEqual(itemB);
  });

  it("openPasteAs is a stable reference across re-renders", () => {
    const { result, rerender } = renderHook(() => usePasteAs());
    const first = result.current.openPasteAs;

    rerender();

    expect(result.current.openPasteAs).toBe(first);
  });

  it("closePasteAs is a stable reference across re-renders", () => {
    const { result, rerender } = renderHook(() => usePasteAs());
    const first = result.current.closePasteAs;

    rerender();

    expect(result.current.closePasteAs).toBe(first);
  });
});
