import { ClipboardItem } from "@/types";
import { parseColor } from "@/utils/color";
import {
  contentCanvas,
  colorContent,
  colorSwatchLarge,
  colorMetaTable,
  colorMetaRow,
  colorMetaLabel,
} from "./index.css";

export function ColorPreview({ item }: { item: ClipboardItem }) {
  const color = parseColor(item.text)!;
  return (
    <div className={contentCanvas}>
      <div className={colorContent}>
        <div
          className={colorSwatchLarge}
          style={{ backgroundColor: color.hex }}
          aria-hidden="true"
        />
        <div className={colorMetaTable}>
          {[
            ["HEX", color.hex],
            ["RGB", color.rgb],
            ["HSL", color.hsl],
          ].map(([label, value]) => (
            <div key={label} className={colorMetaRow}>
              <span className={colorMetaLabel}>{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
