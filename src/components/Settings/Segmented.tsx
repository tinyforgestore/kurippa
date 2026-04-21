import { segControl, segButton, segButtonActive } from "./index.css";

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className={segControl}>
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`${segButton} ${value === opt.value ? segButtonActive : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
