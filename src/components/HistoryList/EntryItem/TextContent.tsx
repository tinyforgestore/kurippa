import { ClipboardItem } from "@/types";
import { itemDisplayLabel } from "@/utils/format";
import { parseColor } from "@/utils/color";
import { colorSwatch, itemText } from "@/components/HistoryList/EntryItem/index.css";

const PREVIEW_TRUNCATE = 500;

interface TextContentProps {
  item: ClipboardItem;
}

export function TextContent({ item }: TextContentProps) {
  const color = parseColor(item.text);
  return (
    <span className={itemText}>
      {color && (
        <span
          className={colorSwatch}
          style={{ backgroundColor: color.hex }}
          aria-hidden="true"
        />
      )}
      {itemDisplayLabel(item, PREVIEW_TRUNCATE)}
    </span>
  );
}
