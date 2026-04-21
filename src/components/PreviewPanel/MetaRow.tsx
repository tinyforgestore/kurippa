import { ClipboardItem } from "@/types";
import { formatRelativeTime } from "@/utils/time";
import { formatAppName, formatSize } from "@/utils/format";
import { metaRow, metaTime, metaDetail } from "./index.css";

export function MetaRow({ item }: { item: ClipboardItem }) {
  const fullTimestamp = new Date(item.created_at).toLocaleString();
  const relTime = formatRelativeTime(item.created_at);
  const appName = item.source_app ? formatAppName(item.source_app) : null;
  const isText = item.kind === "text" || item.kind === "rtf";
  const sizeDetail =
    isText && item.text
      ? `${item.text.length.toLocaleString()} chars · ${formatSize(item.text)}`
      : null;

  return (
    <div className={metaRow}>
      <span className={metaTime} title={fullTimestamp}>
        {relTime}
      </span>
      {appName && <span className={metaDetail}>{appName}</span>}
      {sizeDetail && <span className={metaDetail}>{sizeDetail}</span>}
    </div>
  );
}
