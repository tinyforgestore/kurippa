import { ClipboardItem } from "@/types";
import { contentCanvas, textContent, textFade } from "./index.css";

export function TextPreview({ item }: { item: ClipboardItem }) {
  return (
    <div className={contentCanvas}>
      <pre className={textContent}>{item.text ?? ""}</pre>
      <div className={textFade} aria-hidden="true" />
    </div>
  );
}
