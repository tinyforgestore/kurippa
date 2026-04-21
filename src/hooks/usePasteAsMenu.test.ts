import { renderHook, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePasteAsMenu } from "@/hooks/usePasteAsMenu";
import { PasteOption } from "@/utils/pasteAs";

function makeOption(label: string, text = label): PasteOption {
  return {
    label,
    action: { kind: "paste-text", text, itemId: null as unknown as number },
  };
}

function makeSubmenuOption(label: string, children: PasteOption[]): PasteOption {
  return { label, submenu: children };
}

const SUB_OPTIONS: PasteOption[] = [
  makeOption("Sub A", "subA"),
  makeOption("Sub B", "subB"),
  makeOption("Sub C", "subC"),
];

const OPTIONS: PasteOption[] = [
  makeOption("Option one", "one"),
  makeOption("Option two", "two"),
  makeSubmenuOption("Option three submenu", SUB_OPTIONS),
];

describe("usePasteAsMenu", () => {
  let onClose: () => void;
  let onSelect: (option: PasteOption) => void;
  let onCursorChange: (text: string | null) => void;
  let onOpenPreview: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    onClose = vi.fn();
    onSelect = vi.fn();
    onCursorChange = vi.fn();
    onOpenPreview = vi.fn();
  });

  it("initial cursor is 0", () => {
    const { result } = renderHook(() =>
      usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview),
    );
    expect(result.current.cursor).toBe(0);
  });

  it("initial submenu is null", () => {
    const { result } = renderHook(() =>
      usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview),
    );
    expect(result.current.submenu).toBeNull();
  });

  it("ArrowDown increments cursor", () => {
    const { result } = renderHook(() =>
      usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview),
    );
    act(() => {
      fireEvent.keyDown(document, { key: "ArrowDown" });
    });
    expect(result.current.cursor).toBe(1);
  });

  it("ArrowUp decrements cursor", () => {
    const { result } = renderHook(() =>
      usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview),
    );
    act(() => {
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "ArrowUp" });
    });
    expect(result.current.cursor).toBe(1);
  });

  it("ArrowDown clamps at last option", () => {
    const { result } = renderHook(() =>
      usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview),
    );
    act(() => {
      for (let i = 0; i < 10; i++) {
        fireEvent.keyDown(document, { key: "ArrowDown" });
      }
    });
    expect(result.current.cursor).toBe(OPTIONS.length - 1);
  });

  it("ArrowUp clamps at 0", () => {
    const { result } = renderHook(() =>
      usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview),
    );
    act(() => {
      for (let i = 0; i < 10; i++) {
        fireEvent.keyDown(document, { key: "ArrowUp" });
      }
    });
    expect(result.current.cursor).toBe(0);
  });

  it("pressing 1 calls onSelect with first option", () => {
    renderHook(() => usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview));
    act(() => {
      fireEvent.keyDown(document, { key: "1" });
    });
    expect(onSelect).toHaveBeenCalledWith(OPTIONS[0]);
  });

  it("pressing 2 calls onSelect with second option", () => {
    renderHook(() => usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview));
    act(() => {
      fireEvent.keyDown(document, { key: "2" });
    });
    expect(onSelect).toHaveBeenCalledWith(OPTIONS[1]);
  });

  it("pressing 3 at top level enters the submenu (option with submenu)", () => {
    const { result } = renderHook(() =>
      usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview),
    );
    act(() => {
      fireEvent.keyDown(document, { key: "3" });
    });
    expect(result.current.submenu).not.toBeNull();
    expect(result.current.submenu?.label).toBe("Option three submenu");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("pressing a number out of range does not call onSelect", () => {
    renderHook(() => usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview));
    act(() => {
      fireEvent.keyDown(document, { key: "9" });
    });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("Enter on a regular option calls onSelect", () => {
    renderHook(() => usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview));
    act(() => {
      fireEvent.keyDown(document, { key: "ArrowDown" });
    });
    act(() => {
      fireEvent.keyDown(document, { key: "Enter" });
    });
    expect(onSelect).toHaveBeenCalledWith(OPTIONS[1]);
  });

  it("Enter on a submenu item enters submenu instead of calling onSelect", () => {
    const { result } = renderHook(() =>
      usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview),
    );
    act(() => {
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "ArrowDown" });
    });
    act(() => {
      fireEvent.keyDown(document, { key: "Enter" });
    });
    expect(result.current.submenu).not.toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("Escape at level 1 calls onClose", () => {
    renderHook(() => usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview));
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("ArrowLeft at level 1 calls onClose", () => {
    renderHook(() => usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview));
    act(() => {
      fireEvent.keyDown(document, { key: "ArrowLeft" });
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("Escape at level 2 exits submenu and does NOT call onClose", () => {
    const { result } = renderHook(() =>
      usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview),
    );
    // enter submenu first
    act(() => {
      fireEvent.keyDown(document, { key: "3" });
    });
    expect(result.current.submenu).not.toBeNull();
    // escape from submenu
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(result.current.submenu).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("ArrowLeft at level 2 exits submenu and does NOT call onClose", () => {
    const { result } = renderHook(() =>
      usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview),
    );
    act(() => {
      fireEvent.keyDown(document, { key: "3" });
    });
    act(() => {
      fireEvent.keyDown(document, { key: "ArrowLeft" });
    });
    expect(result.current.submenu).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("ArrowRight on a submenu item at level 1 enters submenu", () => {
    const { result } = renderHook(() =>
      usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview),
    );
    act(() => {
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "ArrowDown" });
    });
    act(() => {
      fireEvent.keyDown(document, { key: "ArrowRight" });
    });
    expect(result.current.submenu).not.toBeNull();
    expect(onOpenPreview).not.toHaveBeenCalled();
  });

  it("ArrowRight on a non-submenu item at level 1 calls onOpenPreview", () => {
    renderHook(() => usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview));
    act(() => {
      fireEvent.keyDown(document, { key: "ArrowRight" });
    });
    expect(onOpenPreview).toHaveBeenCalledOnce();
  });

  it("ArrowRight at level 2 calls onOpenPreview", () => {
    renderHook(() => usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview));
    // enter submenu
    act(() => {
      fireEvent.keyDown(document, { key: "3" });
    });
    act(() => {
      fireEvent.keyDown(document, { key: "ArrowRight" });
    });
    expect(onOpenPreview).toHaveBeenCalledOnce();
  });

  it("number key at level 2 triggers onSelect with submenu item", () => {
    renderHook(() => usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview));
    // enter submenu
    act(() => {
      fireEvent.keyDown(document, { key: "3" });
    });
    act(() => {
      fireEvent.keyDown(document, { key: "2" });
    });
    expect(onSelect).toHaveBeenCalledWith(SUB_OPTIONS[1]);
  });

  it("character shortcut key at level 2 triggers onSelect", () => {
    const wrapOption: PasteOption = { label: "Wrap in double quotes", shortcutKey: '"', action: { kind: "paste-text", text: '"hello"', itemId: null as unknown as number } };
    const wrapSubmenu: PasteOption = { label: "Wrap with…", submenu: [wrapOption] };
    const opts: PasteOption[] = [makeOption("Option one", "one"), wrapSubmenu];

    renderHook(() => usePasteAsMenu(opts, onClose, onSelect, onCursorChange, onOpenPreview));
    // enter wrap submenu via key "2"
    act(() => {
      fireEvent.keyDown(document, { key: "2" });
    });
    act(() => {
      fireEvent.keyDown(document, { key: '"' });
    });
    expect(onSelect).toHaveBeenCalledWith(wrapOption);
  });

  it("ArrowDown in submenu navigates sub cursor", () => {
    const { result } = renderHook(() =>
      usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview),
    );
    act(() => {
      fireEvent.keyDown(document, { key: "3" });
    });
    act(() => {
      fireEvent.keyDown(document, { key: "ArrowDown" });
    });
    expect(result.current.subCursor).toBe(1);
  });

  it("Enter at level 2 calls onSelect with focused submenu item", () => {
    renderHook(() => usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview));
    act(() => {
      fireEvent.keyDown(document, { key: "3" });
    });
    act(() => {
      fireEvent.keyDown(document, { key: "ArrowDown" });
    });
    act(() => {
      fireEvent.keyDown(document, { key: "Enter" });
    });
    expect(onSelect).toHaveBeenCalledWith(SUB_OPTIONS[1]);
  });

  it("onCursorChange is called with text of current option on cursor move", () => {
    renderHook(() => usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview));
    act(() => {
      fireEvent.keyDown(document, { key: "ArrowDown" });
    });
    expect(onCursorChange).toHaveBeenCalledWith("two");
  });

  it("setCursor returned from hook can update cursor directly", () => {
    const { result } = renderHook(() =>
      usePasteAsMenu(OPTIONS, onClose, onSelect, onCursorChange, onOpenPreview),
    );
    act(() => {
      result.current.setCursor(1);
    });
    expect(result.current.cursor).toBe(1);
  });

  // -------------------------------------------------------------------------
  // "0" key handling (lines 103-109)
  // -------------------------------------------------------------------------

  it("pressing '0' at top level selects option with badge '0'", () => {
    const zeroOption: PasteOption = {
      label: "Trim",
      badge: "0",
      action: { kind: "paste-text", text: "trimmed", itemId: null as unknown as number },
    };
    const opts: PasteOption[] = [makeOption("Option one"), zeroOption];

    renderHook(() => usePasteAsMenu(opts, onClose, onSelect, onCursorChange, onOpenPreview));
    act(() => {
      fireEvent.keyDown(document, { key: "0" });
    });
    expect(onSelect).toHaveBeenCalledWith(zeroOption);
  });

  it("pressing '0' at top level selects 10th item (index 9) when no badge '0' exists", () => {
    // Build 11 options so index 9 is reachable and no badge '0' override
    const opts: PasteOption[] = Array.from({ length: 11 }, (_, i) =>
      makeOption(`Option ${i + 1}`)
    );

    renderHook(() => usePasteAsMenu(opts, onClose, onSelect, onCursorChange, onOpenPreview));
    act(() => {
      fireEvent.keyDown(document, { key: "0" });
    });
    expect(onSelect).toHaveBeenCalledWith(opts[9]);
  });

  it("pressing '0' at top level does nothing when fewer than 10 options and no badge '0'", () => {
    // Only 3 options, no badge "0"
    const opts: PasteOption[] = [makeOption("A"), makeOption("B"), makeOption("C")];

    renderHook(() => usePasteAsMenu(opts, onClose, onSelect, onCursorChange, onOpenPreview));
    act(() => {
      fireEvent.keyDown(document, { key: "0" });
    });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("pressing '0' in submenu calls onSelect with submenu option that has badge '0'", () => {
    const zeroSubOption: PasteOption = {
      label: "Zero sub",
      badge: "0",
      action: { kind: "paste-text", text: "zero-sub", itemId: null as unknown as number },
    };
    const subMenuOption: PasteOption = { label: "Submenu", submenu: [makeOption("Sub A"), zeroSubOption] };
    const opts: PasteOption[] = [makeOption("Top"), subMenuOption];

    renderHook(() => usePasteAsMenu(opts, onClose, onSelect, onCursorChange, onOpenPreview));
    // Enter submenu via "2"
    act(() => {
      fireEvent.keyDown(document, { key: "2" });
    });
    act(() => {
      fireEvent.keyDown(document, { key: "0" });
    });
    expect(onSelect).toHaveBeenCalledWith(zeroSubOption);
  });

  // -------------------------------------------------------------------------
  // Character shortcut key at top level (line 136)
  // -------------------------------------------------------------------------

  it("character shortcut key at top level calls onSelect", () => {
    const quoteOption: PasteOption = {
      label: "Wrap in quotes",
      shortcutKey: '"',
      action: { kind: "paste-text", text: '"hello"', itemId: null as unknown as number },
    };
    const opts: PasteOption[] = [makeOption("Option one"), quoteOption];

    renderHook(() => usePasteAsMenu(opts, onClose, onSelect, onCursorChange, onOpenPreview));
    act(() => {
      fireEvent.keyDown(document, { key: '"' });
    });
    expect(onSelect).toHaveBeenCalledWith(quoteOption);
  });

  it("character shortcut key at top level does nothing when no match", () => {
    const opts: PasteOption[] = [makeOption("Option one"), makeOption("Option two")];

    renderHook(() => usePasteAsMenu(opts, onClose, onSelect, onCursorChange, onOpenPreview));
    act(() => {
      fireEvent.keyDown(document, { key: '"' });
    });
    expect(onSelect).not.toHaveBeenCalled();
  });
});
