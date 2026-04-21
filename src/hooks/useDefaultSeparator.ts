import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppSettings } from "@/types/settings";

export function useDefaultSeparator(): "newline" | "space" | "comma" {
  const [defaultSeparator, setDefaultSeparator] = useState<"newline" | "space" | "comma">("newline");

  useEffect(() => {
    invoke<AppSettings>("get_settings")
      .then((s) => {
        const sep = s.multi_paste_separator;
        if (sep === "space" || sep === "comma") {
          setDefaultSeparator(sep);
        } else {
          setDefaultSeparator("newline");
        }
      })
      .catch(console.error);
  }, []);

  return defaultSeparator;
}
