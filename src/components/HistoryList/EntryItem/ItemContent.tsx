import { Image as ImageIcon } from "lucide-react";
import { FuzzyResult } from "@/types";
import { HighlightedContent } from "./HighlightedContent";
import { ImageContent } from "./ImageContent";
import { TextContent } from "./TextContent";

interface ItemContentProps {
  result: FuzzyResult;
}

export function ItemContent({ result }: ItemContentProps) {
  if (result.highlighted) {
    const prefixIcon = result.item.kind === "image" ? <ImageIcon size={14} /> : undefined;
    return <HighlightedContent result={result} prefixIcon={prefixIcon} />;
  }

  switch (result.item.kind) {
    case "image": return <ImageContent item={result.item} />;
    case "text":
    case "rtf":   return <TextContent item={result.item} />;
  }
}
