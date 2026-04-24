import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { AppSettings } from "@/types/settings";
import { defaultSeparatorAtom } from "@/atoms/settings";
import { useSettingsStore } from "@/store";

export function useDefaultSeparator(): "newline" | "space" | "comma" {
  const { defaultSeparator } = useSettingsStore();
  const setDefaultSeparator = useSetAtom(defaultSeparatorAtom);

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
  }, [setDefaultSeparator]);

  return defaultSeparator;
}
