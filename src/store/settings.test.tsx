import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import {
  SettingsStoreContext,
  SettingsStore,
  useSettingsStore,
} from "@/store/settings";

describe("SettingsStoreContext — default value", () => {
  it("exposes newline as the default separator", () => {
    const { result } = renderHook(() => useSettingsStore());
    expect(result.current.defaultSeparator).toBe("newline");
  });
});

describe("useSettingsStore — reads from context", () => {
  it("returns space separator from context", () => {
    const customValue: SettingsStore = {
      defaultSeparator: "space",
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(SettingsStoreContext.Provider, { value: customValue }, children);

    const { result } = renderHook(() => useSettingsStore(), { wrapper });

    expect(result.current.defaultSeparator).toBe("space");
  });

  it("returns comma separator from context", () => {
    const customValue: SettingsStore = {
      defaultSeparator: "comma",
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(SettingsStoreContext.Provider, { value: customValue }, children);

    const { result } = renderHook(() => useSettingsStore(), { wrapper });

    expect(result.current.defaultSeparator).toBe("comma");
  });

  it("returns newline separator from context", () => {
    const customValue: SettingsStore = {
      defaultSeparator: "newline",
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(SettingsStoreContext.Provider, { value: customValue }, children);

    const { result } = renderHook(() => useSettingsStore(), { wrapper });

    expect(result.current.defaultSeparator).toBe("newline");
  });
});
