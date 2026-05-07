import { EntryDefinition } from "@/entries/base";

export const ImageEntry: EntryDefinition = {
  type: "image",
  detect: (entry) => entry.kind === "image",
};
