export interface ClipboardItem {
  id: number;
  kind: "text" | "rtf" | "image";
  text: string | null;
  html: string | null;
  rtf: string | null;
  image_path: string | null;
  source_app: string | null;
  created_at: number;
  pinned: boolean;
  folder_id: number | null;
  qr_text: string | null;
  image_width: number | null;
  image_height: number | null;
}

export interface Folder {
  id: number;
  name: string;
  created_at: number;
  position: number;
}

/** Returned by the `search_history` Tauri command. */
export interface FuzzyResult {
  item: ClipboardItem;
  /** Item text with match characters wrapped in `<b>…</b>`, or null for images. */
  highlighted: string | null;
  score: number;
  folder_name: string | null;
}

export type ListEntry =
  | { kind: "item"; result: FuzzyResult }
  | { kind: "pinned-header"; count: number }
  | { kind: "folder-header"; folderId: number; name: string; count: number; expanded: boolean };

export const HISTORY_DISPLAY_LIMIT = 50;
export const FOLDER_NAME_MAX_LENGTH = 30;
