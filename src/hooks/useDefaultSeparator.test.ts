import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { Provider, createStore } from "jotai";
import { StoreProvider } from "@/store";
import { useDefaultSeparator } from "@/hooks/useDefaultSeparator";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));

function makeWrapper() {
  const store = createStore();
  return { wrapper: ({ children }: { children: React.ReactNode }) => createElement(Provider, { store }, createElement(StoreProvider, null, children)) };
}

describe("useDefaultSeparator", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns newline by default before settings load", () => {
    mockInvoke.mockReturnValue(new Promise(() => {})); // never resolves
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useDefaultSeparator(), { wrapper });
    expect(result.current).toBe("newline");
  });

  it("returns space when settings has multi_paste_separator=space", async () => {
    mockInvoke.mockResolvedValue({ multi_paste_separator: "space" });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useDefaultSeparator(), { wrapper });
    await waitFor(() => expect(result.current).toBe("space"));
  });

  it("returns comma when settings has multi_paste_separator=comma", async () => {
    mockInvoke.mockResolvedValue({ multi_paste_separator: "comma" });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useDefaultSeparator(), { wrapper });
    await waitFor(() => expect(result.current).toBe("comma"));
  });

  it("falls back to newline for unrecognised separator value", async () => {
    mockInvoke.mockResolvedValue({ multi_paste_separator: "tab" });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useDefaultSeparator(), { wrapper });
    await waitFor(() => expect(result.current).toBe("newline"));
  });

  it("falls back to newline when settings value is newline", async () => {
    mockInvoke.mockResolvedValue({ multi_paste_separator: "newline" });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useDefaultSeparator(), { wrapper });
    await waitFor(() => expect(result.current).toBe("newline"));
  });
});
