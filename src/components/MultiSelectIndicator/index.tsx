import { indicator, label, badges, hint, toast } from "@/components/MultiSelectIndicator/index.css";

const SELECTION_BADGES = ["①", "②", "③", "④", "⑤"];

interface MultiSelectIndicatorProps {
  selections: number[];
  maxToastVisible: boolean;
}

export function MultiSelectIndicator({ selections, maxToastVisible }: MultiSelectIndicatorProps) {
  const badgeStr = selections.map((_, i) => SELECTION_BADGES[i]).join("");

  return (
    <div className={indicator}>
      <span className={label}>Multi-select</span>
      {badgeStr && <span className={badges}>{badgeStr}</span>}
      <span className={hint}>Enter to merge · Esc to cancel</span>
      {maxToastVisible && <span className={toast}>Max 5 items</span>}
    </div>
  );
}
