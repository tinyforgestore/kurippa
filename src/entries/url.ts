import { EntryDefinition } from "@/entries/base";

const URL_PATTERN = /^https?:\/\/\S+$/;

export const UrlEntry: EntryDefinition = {
  type: "url",
  detect: (entry) => URL_PATTERN.test((entry.text ?? "").trim()),
};
