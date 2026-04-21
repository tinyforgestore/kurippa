import { useEffect, useState } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { ClipboardItem } from "@/types";

export function useImagePreview(item: ClipboardItem) {
  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAssetUrl(null);
    setFailed(false);
    if (item.image_path == null) {
      setFailed(true);
      return;
    }
    const filename = item.image_path.split("/").pop() ?? item.image_path;
    invoke<string>("get_image_path", { filename })
      .then((path) => {
        if (!cancelled) setAssetUrl(convertFileSrc(path));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  return { assetUrl, failed };
}
