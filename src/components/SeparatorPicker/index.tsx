import cx from "classnames";
import {
  menu,
  menuHeader,
  menuOption,
  menuOptionSelected,
  menuNumber,
} from "@/components/SeparatorPicker/index.css";
import { SEPARATOR_OPTIONS, useSeparatorPicker } from "@/hooks/useSeparatorPicker";

interface SeparatorPickerProps {
  onConfirm: (separator: string) => void;
  onCancel: () => void;
  defaultSeparator: "newline" | "space" | "comma";
}

export function SeparatorPicker({ onConfirm, onCancel, defaultSeparator }: SeparatorPickerProps) {
  const { cursor, setCursor } = useSeparatorPicker(defaultSeparator, onConfirm, onCancel);

  return (
    <div className={menu}>
      <div className={menuHeader}>Choose separator to merge items</div>
      {SEPARATOR_OPTIONS.map((opt, i) => (
        <div
          key={opt.value}
          className={cx(menuOption, { [menuOptionSelected]: i === cursor })}
          onMouseMove={() => setCursor(i)}
          onClick={() => onConfirm(opt.value)}
        >
          <span className={menuNumber}>{i + 1}</span>
          {opt.label}
        </div>
      ))}
    </div>
  );
}
