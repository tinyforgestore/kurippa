import { ClipboardItem } from "@/types";
import { useImagePreview } from "@/hooks/useImagePreview";
import { imageCanvas, emptyState, imageContent } from "./index.css";

export function ImagePreview({ item }: { item: ClipboardItem }) {
  const { assetUrl, failed } = useImagePreview(item);

  return (
    <div className={imageCanvas}>
      {failed && <span className={emptyState}>Image unavailable</span>}
      {!failed && !assetUrl && <span className={emptyState}>Loading image…</span>}
      {!failed && assetUrl && (
        <img src={assetUrl} alt="clipboard image" className={imageContent} />
      )}
    </div>
  );
}
