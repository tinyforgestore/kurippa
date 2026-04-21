import { ClipboardItem } from "@/types";
import { parseColor } from "@/utils/color";
import { TextPreview } from "./TextPreview";
import { ColorPreview } from "./ColorPreview";
import { RtfPreview } from "./RtfPreview";
import { ImagePreview } from "./ImagePreview";
import { MetaRow } from "./MetaRow";
import { ActionRow } from "./ActionRow";
import { panel, emptyState, contentCanvas, textContent, textFade } from "./index.css";

interface PreviewPanelProps {
  item: ClipboardItem | null;
  previewOverride?: string | null;
}

export function PreviewPanel({ item, previewOverride }: PreviewPanelProps) {
  if (!item) {
    return (
      <div className={panel} data-testid="preview-panel">
        <span className={emptyState}>Select an item to preview</span>
      </div>
    );
  }

  if (previewOverride) {
    return (
      <div className={panel} data-testid="preview-panel">
        <div className={contentCanvas}>
          <pre className={textContent}>{previewOverride}</pre>
          <div className={textFade} aria-hidden="true" />
        </div>
        <MetaRow item={item} />
        <ActionRow />
      </div>
    );
  }

  return (
    <div className={panel} data-testid="preview-panel">
      {item.kind === "text" && (
        parseColor(item.text) != null
          ? <ColorPreview item={item} />
          : <TextPreview item={item} />
      )}
      {item.kind === "rtf" && (
        parseColor(item.text) != null ? <ColorPreview item={item} /> : <RtfPreview item={item} />
      )}
      {item.kind === "image" && <ImagePreview item={item} />}
      <MetaRow item={item} />
      <ActionRow />
    </div>
  );
}
