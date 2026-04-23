import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useFolderNameInput } from "@/hooks/useFolderNameInput";

function TestInput() {
  const { ref } = useFolderNameInput();
  return <input ref={ref} />;
}

describe("useFolderNameInput", () => {
  it("returns a ref that attaches to the input element", () => {
    const { container } = render(<TestInput />);
    const input = container.querySelector("input");
    expect(input).not.toBeNull();
  });

  it("input is focused on mount", () => {
    const { container } = render(<TestInput />);
    const input = container.querySelector("input");
    expect(document.activeElement).toBe(input);
  });
});
