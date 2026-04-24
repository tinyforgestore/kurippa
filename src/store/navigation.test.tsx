import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import {
  NavigationStoreContext,
  NavigationStore,
  useNavigationStore,
} from "@/store/navigation";

describe("NavigationStoreContext — default value", () => {
  it("exposes empty query, index 0, null section, false pinned, null folderId", () => {
    const { result } = renderHook(() => useNavigationStore());
    expect(result.current.query).toBe("");
    expect(result.current.selectedIndex).toBe(0);
    expect(result.current.expandedSection).toBeNull();
    expect(result.current.inPinnedSection).toBe(false);
    expect(result.current.expandedFolderId).toBeNull();
  });
});

describe("useNavigationStore — reads from context", () => {
  it("returns string query and numeric index", () => {
    const customValue: NavigationStore = {
      query: "hello",
      selectedIndex: 5,
      expandedSection: null,
      inPinnedSection: false,
      expandedFolderId: null,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(NavigationStoreContext.Provider, { value: customValue }, children);

    const { result } = renderHook(() => useNavigationStore(), { wrapper });

    expect(result.current.query).toBe("hello");
    expect(result.current.selectedIndex).toBe(5);
  });

  it("returns pinned expandedSection", () => {
    const customValue: NavigationStore = {
      query: "",
      selectedIndex: 0,
      expandedSection: "pinned",
      inPinnedSection: true,
      expandedFolderId: null,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(NavigationStoreContext.Provider, { value: customValue }, children);

    const { result } = renderHook(() => useNavigationStore(), { wrapper });

    expect(result.current.expandedSection).toBe("pinned");
    expect(result.current.inPinnedSection).toBe(true);
  });

  it("returns numeric folder expandedSection and expandedFolderId", () => {
    const customValue: NavigationStore = {
      query: "",
      selectedIndex: 0,
      expandedSection: 7,
      inPinnedSection: false,
      expandedFolderId: 7,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(NavigationStoreContext.Provider, { value: customValue }, children);

    const { result } = renderHook(() => useNavigationStore(), { wrapper });

    expect(result.current.expandedSection).toBe(7);
    expect(result.current.expandedFolderId).toBe(7);
  });
});
