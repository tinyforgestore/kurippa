import DOMPurify from "dompurify";
import { ReactNode } from "react";
import { FuzzyResult } from "@/types";
import { itemText } from "@/components/HistoryList/EntryItem/index.css";

interface HighlightedContentProps {
  result: FuzzyResult;
  prefixIcon?: ReactNode;
}

export function HighlightedContent({ result, prefixIcon }: HighlightedContentProps) {
  return (
    <span className={itemText}>
      {prefixIcon != null && <>{prefixIcon}{" "}</>}
      {/* sanitized by DOMPurify — only <b> tags are allowed */}
      <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(result.highlighted!, { ALLOWED_TAGS: ["b"] }) }} />
    </span>
  );
}
