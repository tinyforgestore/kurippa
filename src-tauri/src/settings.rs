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

#[cfg(test)]
mod tests {
    use super::*;

    // ------------------------------------------------------------------
    // Default values
    // ------------------------------------------------------------------

    #[test]
    fn default_values_are_correct() {
        let settings = AppSettings::default();
        assert_eq!(settings.history_limit, HistoryLimit::H500);
        assert!(!settings.launch_at_login);
        assert!(settings.ignored_apps.is_empty());
        assert_eq!(settings.auto_clear_after, AutoClearAfter::Off);
        assert_eq!(settings.multi_paste_separator, MultiPasteSeparator::Newline);
        assert!(!settings.auto_clear_passwords);
    }

    // ------------------------------------------------------------------
    // HistoryLimit serde
    // ------------------------------------------------------------------

    #[test]
    fn history_limit_serde_roundtrips_all_variants() {
        let cases = [
            (HistoryLimit::H100, "\"h100\""),
            (HistoryLimit::H500, "\"h500\""),
            (HistoryLimit::H1000, "\"h1000\""),
            (HistoryLimit::Unlimited, "\"unlimited\""),
        ];
        for (variant, expected_json) in &cases {
            let json = serde_json::to_string(variant)
                .unwrap_or_else(|_| panic!("serialize {expected_json} failed"));
            assert_eq!(&json, expected_json, "serialized JSON mismatch");
            let back: HistoryLimit = serde_json::from_str(&json)
                .unwrap_or_else(|_| panic!("deserialize {json} failed"));
            assert_eq!(&back, variant, "round-trip failed for {expected_json}");
        }
    }

    // ------------------------------------------------------------------
    // AutoClearAfter serde
    // ------------------------------------------------------------------

    #[test]
    fn auto_clear_after_serde_roundtrips_all_variants() {
        let cases = [
            (AutoClearAfter::Off, "\"off\""),
            (AutoClearAfter::Days7, "\"days7\""),
            (AutoClearAfter::Days30, "\"days30\""),
            (AutoClearAfter::Days90, "\"days90\""),
        ];
        for (variant, expected_json) in &cases {
            let json = serde_json::to_string(variant)
                .unwrap_or_else(|_| panic!("serialize {expected_json} failed"));
            assert_eq!(&json, expected_json, "serialized JSON mismatch");
            let back: AutoClearAfter = serde_json::from_str(&json)
                .unwrap_or_else(|_| panic!("deserialize {json} failed"));
            assert_eq!(&back, variant, "round-trip failed for {expected_json}");
        }
    }

    // ------------------------------------------------------------------
    // MultiPasteSeparator serde
    // ------------------------------------------------------------------

    #[test]
    fn multi_paste_separator_serde_roundtrips_all_variants() {
        let cases = [
            (MultiPasteSeparator::None, "\"none\""),
            (MultiPasteSeparator::Newline, "\"newline\""),
            (MultiPasteSeparator::Space, "\"space\""),
            (MultiPasteSeparator::Comma, "\"comma\""),
        ];
        for (variant, expected_json) in &cases {
            let json = serde_json::to_string(variant)
                .unwrap_or_else(|_| panic!("serialize {expected_json} failed"));
            assert_eq!(&json, expected_json, "serialized JSON mismatch");
            let back: MultiPasteSeparator = serde_json::from_str(&json)
                .unwrap_or_else(|_| panic!("deserialize {json} failed"));
            assert_eq!(&back, variant, "round-trip failed for {expected_json}");
        }
    }

    // ------------------------------------------------------------------
    // AppSettings round-trip
    // ------------------------------------------------------------------

    #[test]
    fn app_settings_roundtrip() {
        let original = AppSettings {
            history_limit: HistoryLimit::H1000,
            auto_clear_after: AutoClearAfter::Days30,
            multi_paste_separator: MultiPasteSeparator::Space,
            launch_at_login: true,
            auto_clear_passwords: true,
            ignored_apps: vec![IgnoredApp {
                bundle_id: "com.example.secret".to_string(),
                display_name: "Secret App".to_string(),
            }],
        };

        let json = serde_json::to_string(&original).expect("serialize AppSettings");
        let restored: AppSettings = serde_json::from_str(&json).expect("deserialize AppSettings");

        assert_eq!(restored.history_limit, original.history_limit);
        assert_eq!(restored.auto_clear_after, original.auto_clear_after);
        assert_eq!(restored.multi_paste_separator, original.multi_paste_separator);
        assert_eq!(restored.launch_at_login, original.launch_at_login);
        assert_eq!(restored.auto_clear_passwords, original.auto_clear_passwords);
        assert_eq!(restored.ignored_apps.len(), 1);
        assert_eq!(restored.ignored_apps[0].bundle_id, "com.example.secret");
        assert_eq!(restored.ignored_apps[0].display_name, "Secret App");
    }

    // ------------------------------------------------------------------
    // IgnoredApp serde
    // ------------------------------------------------------------------

    #[test]
    fn ignored_app_serde_roundtrip() {
        let app = IgnoredApp {
            bundle_id: "com.apple.Finder".to_string(),
            display_name: "Finder".to_string(),
        };
        let json = serde_json::to_string(&app).expect("serialize IgnoredApp");
        let back: IgnoredApp = serde_json::from_str(&json).expect("deserialize IgnoredApp");
        assert_eq!(back.bundle_id, "com.apple.Finder");
        assert_eq!(back.display_name, "Finder");
    }
}
