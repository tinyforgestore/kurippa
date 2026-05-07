import { EntryDefinition } from "@/entries/base";

export const RtfEntry: EntryDefinition = {
  type: "rtf",
  detect: (entry) => entry.kind === "rtf",
};
