import { EntryDefinition } from "@/entries/base";
import { parseColor } from "@/utils/color";

export const ColorEntry: EntryDefinition = {
  type: "color",
  detect: (entry) => parseColor((entry.text ?? "").trim()) !== null,
};
