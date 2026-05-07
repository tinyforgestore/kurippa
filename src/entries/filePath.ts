import { EntryDefinition } from "@/entries/base";

const FILE_PATH_PATTERN = /^(\/|~\/|[A-Za-z]:\\)/;

export const FilePathEntry: EntryDefinition = {
  type: "file-path",
  detect: (entry) => FILE_PATH_PATTERN.test((entry.text ?? "").trim()),
};
