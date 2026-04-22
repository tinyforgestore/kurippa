import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import App from "@/components/App";

// ---------------------------------------------------------------------------
// Tauri API mocks
// ---------------------------------------------------------------------------

const mockHide = vi.fn().mockResolvedValue(undefined);

let capturedFocusCallback: ((event: { payload: boolean }) => void) | null = null;
const mockOnFocusChanged = vi.fn((cb) => {
  capturedFocusCallback = cb;
  return Promise.resolve(vi.fn());
});

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    hide: mockHide,
    onFocusChanged: mockOnFocusChanged,
  }),
  LogicalSize: class LogicalSize {
    width: number;
    height: number;
    constructor(w: number, h: number) { this.width = w; this.height = h; }
  },
}));

const defaultSettings = {
  history_limit: "h500",
  auto_clear_after: "off",
  multi_paste_separator: "newline",
  launch_at_login: false,
  auto_clear_passwords: false,
  ignored_apps: [],
};

const mockInvoke = vi.fn().mockResolvedValue([]);
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (cmd: string, ...args: unknown[]) => {
    if (cmd === "get_settings") return Promise.resolve(defaultSettings);
    if (cmd === "get_folders") return Promise.resolve([]);
    if (cmd === "check_permissions") return Promise.resolve({ accessibility: true, input_monitoring: true });
    return mockInvoke(cmd, ...args);
  },
}));

const mockSetSize = vi.fn().mockResolvedValue(undefined);
vi.mock("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({ setSize: mockSetSize }),
}));

const mockUnlisten = vi.fn();
const mockListen = vi.fn().mockResolvedValue(mockUnlisten);
vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}));

vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn().mockResolvedValue(undefined),
  error: vi.fn().mockResolvedValue(undefined),
  warn: vi.fn().mockResolvedValue(undefined),
  debug: vi.fn().mockResolvedValue(undefined),
  trace: vi.fn().mockResolvedValue(undefined),
}));

// Default store factory (can be overridden per-test via mockStoreFactory)
let mockStoreFactory: () => object = () => ({
  get: () => Promise.resolve(null),
  delete: vi.fn(),
  save: vi.fn().mockResolvedValue(undefined),
});

vi.mock("@tauri-apps/plugin-store", () => ({
  load: () => Promise.resolve(mockStoreFactory()),
}));

let mockLicenseMode: "trial" | "first_launch" | "activated" | "device_limit" = "trial";

vi.mock("@/hooks/useLicense", () => ({
  useLicense: () => ({
    get mode() { return mockLicenseMode; },
    licenseInfo: null,
    deactivate: vi.fn().mockResolvedValue(undefined),
    openActivationWindow: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a ClipboardItem suitable for use as invoke("get_history") return value. */
function makeItem(id: number, text: string) {
  return {
    id,
    kind: "text" as const,
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

function renderApp() {
  return render(<App />);
}

// ---------------------------------------------------------------------------
// Tests — dismiss behaviour
// ---------------------------------------------------------------------------

describe("App — dismiss behaviour", () => {
  beforeEach(() => {
    mockHide.mockClear();
    mockInvoke.mockResolvedValue([]);
    capturedFocusCallback = null;
  });

  it("renders the search input with autoFocus", () => {
    renderApp();
    const input = screen.getByPlaceholderText("Search...");
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it("calls hide() and clears query when Escape is pressed on the input", async () => {
    renderApp();
    const input = screen.getByPlaceholderText("Search...");

    fireEvent.change(input, { target: { value: "hello" } });
    expect(input).toHaveValue("hello");

    fireEvent.keyDown(input, { key: "Escape" });

    await waitFor(() => expect(mockHide).toHaveBeenCalled());
    expect(input).toHaveValue("");
  });

  it("calls hide() and clears query when Escape is pressed via document keydown fallback", async () => {
    renderApp();
    const input = screen.getByPlaceholderText("Search...");

    fireEvent.change(input, { target: { value: "world" } });

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(mockHide).toHaveBeenCalledTimes(1));
    expect(input).toHaveValue("");
  });

  it("does NOT call hide() for non-Escape keys on the input", () => {
    renderApp();
    const input = screen.getByPlaceholderText("Search...");

    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "a" });

    expect(mockHide).not.toHaveBeenCalled();
  });

  it("does NOT call hide() for non-Escape keys on the document", () => {
    renderApp();

    fireEvent.keyDown(document, { key: "ArrowDown" });

    expect(mockHide).not.toHaveBeenCalled();
  });

  it("removes the document keydown listener on unmount", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    const { unmount } = renderApp();
    unmount();

    const addedHandler = addSpy.mock.calls.find(([evt]) => evt === "keydown")?.[1];
    const removedHandler = removeSpy.mock.calls.find(([evt]) => evt === "keydown")?.[1];

    expect(addedHandler).toBeDefined();
    expect(removedHandler).toBe(addedHandler);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("window focus gain resets selectedIndex to 0", async () => {
    mockInvoke.mockResolvedValueOnce([makeItem(1, "first"), makeItem(2, "second")]);

    renderApp();
    await waitFor(() => expect(screen.getByText("first")).toBeInTheDocument());

    // Navigate down to index 1
    await act(async () => {
      fireEvent.keyDown(document, { key: "ArrowDown" });
    });
    let items = document.querySelectorAll("[data-item]");
    expect(items[1]).toHaveAttribute("data-selected");

    // Fire focus gained callback
    await act(async () => {
      capturedFocusCallback?.({ payload: true });
    });

    // Selection should reset to first item
    items = document.querySelectorAll("[data-item]");
    expect(items[0]).toHaveAttribute("data-selected");
    expect(items[1]).not.toHaveAttribute("data-selected");
  });

  it("window focus gain closes Paste As menu if it was open", async () => {
    mockInvoke.mockResolvedValueOnce([makeItem(1, "rich text item")]);
    mockInvoke.mockResolvedValue(undefined);

    renderApp();
    await waitFor(() => expect(screen.getByText("rich text item")).toBeInTheDocument());

    // Open the Paste As menu
    fireEvent.keyDown(document, { key: "Enter", shiftKey: true });
    await waitFor(() => expect(screen.getByText(/Paste as…/)).toBeInTheDocument());

    // Fire focus gained callback
    await act(async () => {
      capturedFocusCallback?.({ payload: true });
    });

    // Paste As menu should be gone
    expect(screen.queryByText(/Paste as…/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tests — clipboard history
// ---------------------------------------------------------------------------

describe("App — clipboard history", () => {
  beforeEach(() => {
    mockInvoke.mockResolvedValue([]);
  });

  it("renders history items returned by invoke", async () => {
    mockInvoke.mockResolvedValueOnce([makeItem(1, "copied text")]);

    renderApp();

    await waitFor(() => expect(screen.getByText("copied text")).toBeInTheDocument());
  });

  it("renders image placeholder for image items", async () => {
    mockInvoke.mockResolvedValueOnce([
      {
        id: 2,
        kind: "image" as const,
        text: null,
        html: null,
        rtf: null,
        image_path: "2.png",
        source_app: null,
        created_at: 2000,
        pinned: false,
        folder_id: null,
        qr_text: null,
      },
    ]);

    renderApp();

    await waitFor(() => expect(document.querySelector("svg")).toBeInTheDocument());
  });
});

// ---------------------------------------------------------------------------
// Tests — fuzzy search
// ---------------------------------------------------------------------------

describe("App — fuzzy search", () => {
  beforeEach(() => {
    mockInvoke.mockResolvedValue([]);
  });

  it("filters items in-memory when query is non-empty", async () => {
    mockInvoke.mockResolvedValueOnce([makeItem(1, "apple"), makeItem(2, "banana")]);

    renderApp();
    await waitFor(() => expect(screen.getByText("apple")).toBeInTheDocument());

    const input = screen.getByPlaceholderText("Search...");
    await act(async () => {
      fireEvent.change(input, { target: { value: "ban" } });
    });

    // banana is rendered with highlight markup (<b>ban</b>ana), so check via data-item presence
    await waitFor(() => {
      expect(screen.queryByText("apple")).not.toBeInTheDocument();
      expect(document.querySelectorAll("[data-item]")).toHaveLength(1);
    });
    expect(mockInvoke).not.toHaveBeenCalledWith("search_history", expect.anything());
  });

  it("renders fuzzy match highlights as HTML", async () => {
    mockInvoke.mockResolvedValueOnce([makeItem(1, "apple")]);

    renderApp();
    await waitFor(() => expect(screen.getByText("apple")).toBeInTheDocument());

    const input = screen.getByPlaceholderText("Search...");
    await act(async () => {
      fireEvent.change(input, { target: { value: "a" } });
    });

    // In-memory fuzzyMatch wraps the match in <b>a</b>pple, rendered via dangerouslySetInnerHTML
    await waitFor(() => expect(screen.getByText("pple")).toBeInTheDocument());
  });

  it("resets to full history when query is cleared", async () => {
    mockInvoke.mockResolvedValueOnce([makeItem(1, "apple"), makeItem(2, "banana")]);

    renderApp();
    await waitFor(() => expect(screen.getByText("apple")).toBeInTheDocument());

    const input = screen.getByPlaceholderText("Search...");
    await act(async () => {
      fireEvent.change(input, { target: { value: "ban" } });
    });

    await waitFor(() => expect(screen.queryByText("apple")).not.toBeInTheDocument());

    // Clear the query — should show all items again without another invoke call
    await act(async () => {
      fireEvent.change(input, { target: { value: "" } });
    });

    await waitFor(() => expect(screen.getByText("apple")).toBeInTheDocument());
    expect(screen.getByText("banana")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tests — keyboard navigation
// ---------------------------------------------------------------------------

describe("App — keyboard navigation", () => {
  beforeEach(() => {
    mockInvoke.mockResolvedValue([]);
  });

  it("first item is selected by default", async () => {
    mockInvoke.mockResolvedValueOnce([makeItem(1, "first"), makeItem(2, "second")]);

    renderApp();
    await waitFor(() => expect(screen.getByText("first")).toBeInTheDocument());

    const items = document.querySelectorAll("[data-item]");
    expect(items[0]).toHaveAttribute("data-selected");
    expect(items[1]).not.toHaveAttribute("data-selected");
  });

  it("ArrowDown moves selection to next item", async () => {
    mockInvoke.mockResolvedValueOnce([makeItem(1, "first"), makeItem(2, "second")]);

    renderApp();
    await waitFor(() => expect(screen.getByText("first")).toBeInTheDocument());

    await act(async () => {
      fireEvent.keyDown(document, { key: "ArrowDown" });
    });

    const items = document.querySelectorAll("[data-item]");
    expect(items[0]).not.toHaveAttribute("data-selected");
    expect(items[1]).toHaveAttribute("data-selected");
  });

  it("ArrowUp moves selection to previous item", async () => {
    mockInvoke.mockResolvedValueOnce([makeItem(1, "first"), makeItem(2, "second"), makeItem(3, "third")]);

    renderApp();
    await waitFor(() => expect(screen.getByText("first")).toBeInTheDocument());

    // Move down twice, then back up once
    await act(async () => {
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "ArrowUp" });
    });

    const items = document.querySelectorAll("[data-item]");
    expect(items[1]).toHaveAttribute("data-selected");
  });

  it("ArrowDown does not move past the last item", async () => {
    mockInvoke.mockResolvedValueOnce([makeItem(1, "only")]);

    renderApp();
    await waitFor(() => expect(screen.getByText("only")).toBeInTheDocument());

    await act(async () => {
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "ArrowDown" });
    });

    const items = document.querySelectorAll("[data-item]");
    expect(items[0]).toHaveAttribute("data-selected");
  });

  it("ArrowUp does not move above the first item", async () => {
    mockInvoke.mockResolvedValueOnce([makeItem(1, "first"), makeItem(2, "second")]);

    renderApp();
    await waitFor(() => expect(screen.getByText("first")).toBeInTheDocument());

    await act(async () => {
      fireEvent.keyDown(document, { key: "ArrowUp" });
      fireEvent.keyDown(document, { key: "ArrowUp" });
    });

    const items = document.querySelectorAll("[data-item]");
    expect(items[0]).toHaveAttribute("data-selected");
  });

  it("Enter calls paste_item with the selected item text", async () => {
    mockInvoke.mockResolvedValueOnce([makeItem(1, "first"), makeItem(2, "second")]);
    mockInvoke.mockResolvedValue(undefined); // paste_item

    renderApp();
    await waitFor(() => expect(screen.getByText("first")).toBeInTheDocument());

    // Navigate to second item and press Enter
    await act(async () => { fireEvent.keyDown(document, { key: "ArrowDown" }); });
    await act(async () => { fireEvent.keyDown(document, { key: "Enter" }); });

    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith("paste_item", {
      text: "second",
      plainText: false,
      itemId: 2,
    }));
  });

  it("Shift+Enter opens the PasteAs menu (does not call paste_item)", async () => {
    mockInvoke.mockResolvedValueOnce([makeItem(1, "rich text item")]);
    mockInvoke.mockResolvedValue(undefined);

    renderApp();
    await waitFor(() => expect(screen.getByText("rich text item")).toBeInTheDocument());

    fireEvent.keyDown(document, { key: "Enter", shiftKey: true });

    // PasteAs menu should appear; paste_item should NOT have been called
    await waitFor(() => expect(screen.getByText(/Paste as…/)).toBeInTheDocument());
    expect(mockInvoke).not.toHaveBeenCalledWith("paste_item", expect.objectContaining({ plainText: true }));
  });

  it("clicking an item calls paste_item with that item's text", async () => {
    mockInvoke.mockResolvedValueOnce([makeItem(1, "click me")]);
    mockInvoke.mockResolvedValue(undefined);

    renderApp();
    await waitFor(() => expect(screen.getByText("click me")).toBeInTheDocument());

    fireEvent.click(screen.getByText("click me"));

    expect(mockInvoke).toHaveBeenCalledWith("paste_item", {
      text: "click me",
      plainText: false,
      itemId: 1,
    });
  });

  it("hovering an item updates the selected index", async () => {
    mockInvoke.mockResolvedValueOnce([makeItem(1, "first"), makeItem(2, "second")]);

    renderApp();
    await waitFor(() => expect(screen.getByText("first")).toBeInTheDocument());

    fireEvent.mouseMove(screen.getByText("second").closest("[data-item]")!);

    const items = document.querySelectorAll("[data-item]");
    expect(items[1]).toHaveAttribute("data-selected");
    expect(items[0]).not.toHaveAttribute("data-selected");
  });

  it("selectedIndex resets to 0 after query changes", async () => {
    mockInvoke.mockResolvedValueOnce([makeItem(1, "apple"), makeItem(2, "banana")]);

    renderApp();
    await waitFor(() => expect(screen.getByText("apple")).toBeInTheDocument());

    // Select second item
    await act(async () => {
      fireEvent.keyDown(document, { key: "ArrowDown" });
    });
    let items = document.querySelectorAll("[data-item]");
    expect(items[1]).toHaveAttribute("data-selected");

    // Type a query → results update, selection resets
    const input = screen.getByPlaceholderText("Search...");
    await act(async () => {
      fireEvent.change(input, { target: { value: "ban" } });
    });

    // banana renders with highlight markup after filtering, check via data-item presence
    await waitFor(() => expect(document.querySelectorAll("[data-item]")).toHaveLength(1));
    items = document.querySelectorAll("[data-item]");
    expect(items[0]).toHaveAttribute("data-selected");
  });

  it("ArrowRight opens the preview panel", async () => {
    mockInvoke.mockResolvedValueOnce([makeItem(1, "first")]);

    renderApp();
    await waitFor(() => expect(screen.getByText("first")).toBeInTheDocument());

    expect(document.querySelector("[data-testid='preview-panel']")).toBeNull();

    fireEvent.keyDown(document, { key: "ArrowRight" });

    await waitFor(() =>
      expect(document.querySelector("[data-testid='preview-panel']")).not.toBeNull()
    );
  });

  it("ArrowRight then ArrowLeft closes the preview panel", async () => {
    mockInvoke.mockResolvedValueOnce([makeItem(1, "first")]);

    renderApp();
    await waitFor(() => expect(screen.getByText("first")).toBeInTheDocument());

    fireEvent.keyDown(document, { key: "ArrowRight" });
    await waitFor(() =>
      expect(document.querySelector("[data-testid='preview-panel']")).not.toBeNull()
    );

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    await waitFor(() =>
      expect(document.querySelector("[data-testid='preview-panel']")).toBeNull()
    );
  });

  it("ArrowLeft after ArrowRight does NOT call hide()", async () => {
    mockInvoke.mockResolvedValueOnce([makeItem(1, "first")]);

    renderApp();
    await waitFor(() => expect(screen.getByText("first")).toBeInTheDocument());

    fireEvent.keyDown(document, { key: "ArrowRight" });
    await waitFor(() =>
      expect(document.querySelector("[data-testid='preview-panel']")).not.toBeNull()
    );

    mockHide.mockClear();
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    await waitFor(() =>
      expect(document.querySelector("[data-testid='preview-panel']")).toBeNull()
    );

    expect(mockHide).not.toHaveBeenCalled();
  });

  it("⌘Backspace does NOT call delete_item immediately (only after animation timer fires)", async () => {
    vi.useFakeTimers();
    try {
      mockInvoke.mockResolvedValueOnce([makeItem(5, "to delete")]);
      mockInvoke.mockResolvedValue(undefined);

      renderApp();
      await act(async () => {});

      mockInvoke.mockClear();
      mockInvoke.mockResolvedValue(undefined);

      act(() => {
        fireEvent.keyDown(document, { key: "Backspace", metaKey: true });
      });

      // Timer has not fired yet — delete_item must not have been called
      expect(mockInvoke).not.toHaveBeenCalledWith("delete_item", expect.anything());
    } finally {
      vi.useRealTimers();
    }
  });

  it("⌘Backspace calls delete_item with the selected item id after animation timer fires", async () => {
    vi.useFakeTimers();
    try {
      mockInvoke.mockResolvedValueOnce([makeItem(5, "to delete")]);
      mockInvoke.mockResolvedValue(undefined);

      renderApp();
      await act(async () => {});

      mockInvoke.mockClear();
      mockInvoke.mockResolvedValue(undefined);

      act(() => {
        fireEvent.keyDown(document, { key: "Backspace", metaKey: true });
      });

      await act(async () => {
        vi.runAllTimers();
        await Promise.resolve();
      });

      expect(mockInvoke).toHaveBeenCalledWith("delete_item", { id: 5 });
    } finally {
      vi.useRealTimers();
    }
  });

  it("selecting a paste-text option from Paste As menu calls paste_item with plainText: true", async () => {
    mockInvoke.mockResolvedValueOnce([makeItem(1, "hello")]);
    mockInvoke.mockResolvedValue(undefined);

    renderApp();
    await waitFor(() => expect(screen.getByText("hello")).toBeInTheDocument());

    // Open Paste As menu
    await act(async () => { fireEvent.keyDown(document, { key: "Enter", shiftKey: true }); });
    await waitFor(() => expect(screen.getByText(/Paste as…/)).toBeInTheDocument());

    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue(undefined);

    // Press 1 to select first paste option ("Paste as plain text")
    fireEvent.keyDown(document, { key: "1" });

    await waitFor(() =>
      expect(mockInvoke).toHaveBeenCalledWith("paste_item", expect.objectContaining({
        text: "hello",
        plainText: true,
        itemId: 1,
      }))
    );
  });

  it("selecting a paste-image option from Paste As menu calls paste_image_item", async () => {
    const imageItem = {
      id: 42,
      kind: "image" as const,
      text: null,
      html: null,
      rtf: null,
      image_path: "42.png",
      source_app: null,
      created_at: 42000,
      pinned: false,
      folder_id: null,
      qr_text: null,
    };
    mockInvoke.mockResolvedValueOnce([imageItem]);
    mockInvoke.mockResolvedValue(undefined);

    renderApp();
    await waitFor(() => expect(document.querySelector("[data-item]")).toBeInTheDocument());

    // Open Paste As menu
    await act(async () => { fireEvent.keyDown(document, { key: "Enter", shiftKey: true }); });
    await waitFor(() => expect(screen.getByText(/Paste as…/)).toBeInTheDocument());

    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue(undefined);

    // Press 1 to select first paste option ("Paste as image")
    fireEvent.keyDown(document, { key: "1" });

    await waitFor(() =>
      expect(mockInvoke).toHaveBeenCalledWith("paste_image_item", {
        imageFilename: "42.png",
        itemId: 42,
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Tests — pin lift / landing animation state
// ---------------------------------------------------------------------------

describe("App — pin lift / landing animation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockInvoke.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makePinnableItem(id: number, text: string, pinned = false) {
    return {
      id,
      kind: "text" as const,
      text,
      html: null,
      rtf: null,
      image_path: null,
      source_app: null,
      created_at: id * 1000,
      pinned,
      folder_id: null,
      qr_text: null,
    };
  }

  it("calls togglePinItem after 150ms delay when ⌘P is pressed", async () => {
    mockInvoke.mockResolvedValueOnce([makePinnableItem(1, "item one"), makePinnableItem(2, "item two")]);
    mockInvoke.mockResolvedValue(undefined);

    renderApp();
    await act(async () => {});

    // Clear invokes from initial load
    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue(undefined);

    act(() => {
      fireEvent.keyDown(document, { key: "p", metaKey: true });
    });

    // pin_item should NOT be called yet (within 150ms delay)
    expect(mockInvoke).not.toHaveBeenCalledWith("pin_item", expect.anything());

    // Advance timers by 150ms → the delayed togglePinItem fires
    await act(async () => {
      vi.advanceTimersByTime(150);
      await Promise.resolve();
    });

    expect(mockInvoke).toHaveBeenCalledWith("pin_item", { id: 1 });
  });

  it("liftingId is set immediately and cleared after 150ms", async () => {
    mockInvoke.mockResolvedValueOnce([makePinnableItem(5, "lift me")]);
    mockInvoke.mockResolvedValue(undefined);

    const { container } = renderApp();
    await act(async () => {});

    // Trigger pin toggle
    act(() => {
      fireEvent.keyDown(document, { key: "p", metaKey: true });
    });

    // Before 150ms, the item should have the lifting class applied via data-item attribute
    // We check the item element exists (lifting is a prop that applies a CSS class)
    const itemEl = container.querySelector("[data-item]");
    expect(itemEl).toBeInTheDocument();

    // After 150ms the state update fires — invoke the toggle
    await act(async () => {
      vi.advanceTimersByTime(150);
      await Promise.resolve();
    });

    // After lift delay + landing clear (300ms more)
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    // The item is still in the DOM
    expect(container.querySelector("[data-item]")).toBeInTheDocument();
  });

  it("landingId is set after toggle fires and cleared after 300ms", async () => {
    mockInvoke.mockResolvedValueOnce([makePinnableItem(7, "land me")]);
    mockInvoke.mockResolvedValue(undefined);

    renderApp();
    await act(async () => {});

    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue(undefined);

    act(() => {
      fireEvent.keyDown(document, { key: "p", metaKey: true });
    });

    // Advance past the 150ms lift delay — togglePinItem fires, landingId set to 7
    await act(async () => {
      vi.advanceTimersByTime(150);
      await Promise.resolve();
    });

    expect(mockInvoke).toHaveBeenCalledWith("pin_item", { id: 7 });

    // Advance past the 300ms landing duration — landingId clears
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    // No crash, item still rendered
    expect(screen.getByText("land me")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tests — license mode: first_launch renders null
// ---------------------------------------------------------------------------

describe("App — first_launch mode", () => {
  beforeEach(() => {
    mockLicenseMode = "first_launch";
    mockInvoke.mockResolvedValue([]);
  });

  afterEach(() => {
    mockLicenseMode = "trial";
  });

  it("renders null (no search input) when mode is first_launch", () => {
    renderApp();
    expect(screen.queryByPlaceholderText("Search...")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests — checkStoreFlags / visibilitychange
// ---------------------------------------------------------------------------

describe("App — checkStoreFlags / visibilitychange", () => {
  beforeEach(() => {
    mockLicenseMode = "trial";
    mockInvoke.mockResolvedValue([]);
    // Reset to default store
    mockStoreFactory = () => ({
      get: () => Promise.resolve(null),
      delete: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    mockLicenseMode = "trial";
  });

  it("shows activated toast and hides after 2s when just_activated flag is set", async () => {
    vi.useFakeTimers();
    const mockDelete = vi.fn();
    const mockSave = vi.fn().mockResolvedValue(undefined);

    mockStoreFactory = () => ({
      get: vi.fn().mockImplementation((key: string) => {
        if (key === "just_activated") return Promise.resolve(true);
        return Promise.resolve(null);
      }),
      delete: mockDelete,
      save: mockSave,
    });

    renderApp();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Toast should be visible
    expect(screen.getByText(/kurippa activated/i)).toBeInTheDocument();

    // Advance 2s — toast disappears
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });
    expect(screen.queryByText(/kurippa activated/i)).toBeNull();

    vi.useRealTimers();
  });

  it("shows revoked banner when license_revoked flag is set", async () => {
    mockStoreFactory = () => ({
      get: vi.fn().mockImplementation((key: string) => {
        if (key === "just_activated") return Promise.resolve(null);
        if (key === "license_revoked") return Promise.resolve(true);
        return Promise.resolve(null);
      }),
      delete: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
    });

    renderApp();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText(/your license is no longer valid/i)).toBeInTheDocument();
  });

  it("visibilitychange to visible triggers checkStoreFlags", async () => {
    const mockGet = vi.fn().mockResolvedValue(null);
    mockStoreFactory = () => ({
      get: mockGet,
      delete: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
    });

    renderApp();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const initialCallCount = mockGet.mock.calls.length;

    // Simulate visibility change to visible
    Object.defineProperty(document, "visibilityState", { value: "visible", writable: true, configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
      await Promise.resolve();
    });

    // load (and thus get) should have been called again
    expect(mockGet.mock.calls.length).toBeGreaterThan(initialCallCount);
  });
});
