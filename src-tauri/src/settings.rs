use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum HistoryLimit {
    H100,
    H500,
    H1000,
    Unlimited,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AutoClearAfter {
    Off,
    Days7,
    Days30,
    Days90,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MultiPasteSeparator {
    None,
    Newline,
    Space,
    Comma,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IgnoredApp {
    pub bundle_id: String,
    pub display_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub history_limit: HistoryLimit,
    pub auto_clear_after: AutoClearAfter,
    pub multi_paste_separator: MultiPasteSeparator,
    pub launch_at_login: bool,
    pub auto_clear_passwords: bool,
    pub ignored_apps: Vec<IgnoredApp>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            history_limit: HistoryLimit::H500,
            auto_clear_after: AutoClearAfter::Off,
            multi_paste_separator: MultiPasteSeparator::Newline,
            launch_at_login: false,
            auto_clear_passwords: false,
            ignored_apps: vec![],
        }
    }
}

pub fn load(app: &tauri::AppHandle) -> AppSettings {
    let path = app
        .path()
        .app_data_dir()
        .map(|d: std::path::PathBuf| d.join("settings.json"))
        .ok();
    path.and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s: String| serde_json::from_str::<AppSettings>(&s).ok())
        .unwrap_or_default()
}

pub fn save(app: &tauri::AppHandle, settings: &AppSettings) {
    if let Ok(dir) = app.path().app_data_dir() {
        let dir: std::path::PathBuf = dir;
        if let Ok(json) = serde_json::to_string_pretty(settings) {
            let _ = std::fs::write(dir.join("settings.json"), json);
        }
    }
}
