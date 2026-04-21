import { Image as ImageIcon } from "lucide-react";
import { ClipboardItem } from "@/types";
import { itemText } from "@/components/HistoryList/EntryItem/index.css";
import { truncateMiddle } from "@/utils/format";
import { formatRelativeTime } from "@/utils/time";

const MAX_FILENAME_LEN = 30;

interface ImageContentProps {
  item: ClipboardItem;
}

export function ImageContent({ item }: ImageContentProps) {
  const fullTimestamp = new Date(item.created_at).toLocaleString();

  if (item.text) {
    const parts = item.text.replace(/\\/g, "/").split("/");
    const filename = parts[parts.length - 1] || item.text;
    const display = truncateMiddle(filename, MAX_FILENAME_LEN);
    return (
      <span className={itemText} title={fullTimestamp}>
        <ImageIcon size={14} />
        {" "}{display}
      </span>
    );
  }

  const relTime = formatRelativeTime(item.created_at);
  const dims =
    item.image_width != null && item.image_height != null
      ? ` · ${item.image_width}×${item.image_height}`
      : "";

  return (
    <span className={itemText} title={fullTimestamp}>
      <ImageIcon size={14} />
      {" "}copied {relTime}{dims}
    </span>
  );
}
