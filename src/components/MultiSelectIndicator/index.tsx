import { indicator, label, badges, hint, toast } from "@/components/MultiSelectIndicator/index.css";

const SELECTION_BADGES = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

interface MultiSelectIndicatorProps {
  selections: number[];
  maxToastVisible: boolean;
  maxToastCap: number;
}

export function MultiSelectIndicator({ selections, maxToastVisible, maxToastCap }: MultiSelectIndicatorProps) {
  const badgeStr = selections.map((_, i) => SELECTION_BADGES[i]).join("");

  return (
    <div className={indicator}>
      <span className={label}>Multi-select</span>
      {badgeStr && <span className={badges}>{badgeStr}</span>}
      <span className={hint}>Enter for actions · Esc to cancel</span>
      {maxToastVisible && <span className={toast}>Max {maxToastCap} items</span>}
    </div>
  );
}
