import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSettingsApp } from "@/hooks/useSettingsApp";
import React from "react";

function makeKeyEvent(key: string): React.KeyboardEvent<HTMLDivElement> {
  return { key, preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLDivElement>;
}

describe("useSettingsApp", () => {
  beforeEach(() => vi.clearAllMocks());

  it('initial activeTab is "general"', () => {
    const { result } = renderHook(() => useSettingsApp());
    expect(result.current.activeTab).toBe("general");
  });

  it("setActiveTab changes the tab directly", () => {
    const { result } = renderHook(() => useSettingsApp());
    act(() => result.current.setActiveTab("privacy"));
    expect(result.current.activeTab).toBe("privacy");
  });

  it("ArrowDown: general→hotkeys→privacy→about", () => {
    const { result } = renderHook(() => useSettingsApp());
    act(() => result.current.handleSidebarKeyDown(makeKeyEvent("ArrowDown")));
    expect(result.current.activeTab).toBe("hotkeys");
    act(() => result.current.handleSidebarKeyDown(makeKeyEvent("ArrowDown")));
    expect(result.current.activeTab).toBe("privacy");
    act(() => result.current.handleSidebarKeyDown(makeKeyEvent("ArrowDown")));
    expect(result.current.activeTab).toBe("about");
  });

  it("ArrowUp: about→privacy→hotkeys→general", () => {
    const { result } = renderHook(() => useSettingsApp());
    act(() => result.current.setActiveTab("about"));
    act(() => result.current.handleSidebarKeyDown(makeKeyEvent("ArrowUp")));
    expect(result.current.activeTab).toBe("privacy");
    act(() => result.current.handleSidebarKeyDown(makeKeyEvent("ArrowUp")));
    expect(result.current.activeTab).toBe("hotkeys");
    act(() => result.current.handleSidebarKeyDown(makeKeyEvent("ArrowUp")));
    expect(result.current.activeTab).toBe("general");
  });

  it('ArrowDown on "about" (last) stays on "about"', () => {
    const { result } = renderHook(() => useSettingsApp());
    act(() => result.current.setActiveTab("about"));
    act(() => result.current.handleSidebarKeyDown(makeKeyEvent("ArrowDown")));
    expect(result.current.activeTab).toBe("about");
  });

  it('ArrowUp on "general" (first) stays on "general"', () => {
    const { result } = renderHook(() => useSettingsApp());
    act(() => result.current.handleSidebarKeyDown(makeKeyEvent("ArrowUp")));
    expect(result.current.activeTab).toBe("general");
  });

  it('other key "Enter" does not change tab', () => {
    const { result } = renderHook(() => useSettingsApp());
    act(() => result.current.handleSidebarKeyDown(makeKeyEvent("Enter")));
    expect(result.current.activeTab).toBe("general");
  });

  it("buttonRefs is a Map ref on mount", () => {
    const { result } = renderHook(() => useSettingsApp());
    expect(result.current.buttonRefs.current).toBeInstanceOf(Map);
  });
});
