import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEffect, useState } from "react";
import { flushEffects } from "./flushEffects";

describe("flushEffects", () => {
  it("flushes a microtask-based useEffect setState without warnings", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    function useThing() {
      const [v, setV] = useState(0);
      useEffect(() => {
        Promise.resolve().then(() => setV(1));
      }, []);
      return v;
    }
    const { result } = renderHook(() => useThing());
    expect(result.current).toBe(0);
    await flushEffects();
    expect(result.current).toBe(1);
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("wrapped into act"),
    );
    consoleError.mockRestore();
  });
});
