import DOMPurify from "dompurify";
import { ClipboardItem } from "@/types";
import { contentCanvas, rtfContent, textFade } from "./index.css";

export function RtfPreview({ item }: { item: ClipboardItem }) {
  const raw = item.html ?? item.rtf ?? "";
  const sanitized = DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
  return (
    <div className={contentCanvas}>
      <div
        className={rtfContent}
        // sanitized by DOMPurify
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
      <div className={textFade} aria-hidden="true" />
    </div>
  );
}
