import { useEffect, useState } from "react";

export interface SeparatorOption {
  label: string;
  value: string;
}

export const SEPARATOR_OPTIONS: SeparatorOption[] = [
  { label: "↵  Newline", value: "newline" },
  { label: "·  Space", value: "space" },
  { label: ",  Comma", value: "comma" },
];

export function useSeparatorPicker(
  defaultSeparator: "newline" | "space" | "comma",
  onConfirm: (separator: string) => void,
  onCancel: () => void,
): { cursor: number; setCursor: (i: number) => void } {
  const defaultIndex = SEPARATOR_OPTIONS.findIndex((o) => o.value === defaultSeparator);
  const [cursor, setCursor] = useState(defaultIndex >= 0 ? defaultIndex : 0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "ArrowLeft") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (/^[1-3]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        e.preventDefault();
        onConfirm(SEPARATOR_OPTIONS[idx].value);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((i) => Math.min(i + 1, SEPARATOR_OPTIONS.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm(SEPARATOR_OPTIONS[cursor].value);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [cursor, onConfirm, onCancel]);

  return { cursor, setCursor };
}
