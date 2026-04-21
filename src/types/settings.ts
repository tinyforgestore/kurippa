export type HistoryLimit = "h100" | "h500" | "h1000" | "unlimited";
export type AutoClearAfter = "off" | "days7" | "days30" | "days90";
export type MultiPasteSeparator = "none" | "newline" | "space" | "comma";

export interface IgnoredApp {
  bundle_id: string;
  display_name: string;
}

export interface AppSettings {
  history_limit: HistoryLimit;
  auto_clear_after: AutoClearAfter;
  multi_paste_separator: MultiPasteSeparator;
  launch_at_login: boolean;
  auto_clear_passwords: boolean;
  ignored_apps: IgnoredApp[];
}
