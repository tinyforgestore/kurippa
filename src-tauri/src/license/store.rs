use crate::license::types::LicenseInfo;
use tauri::Manager;

pub(crate) const LICENSE_FILE: &str = "kurippa-license.json";

pub(super) fn license_file_path(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    app.path().app_data_dir().ok().map(|d| d.join(LICENSE_FILE))
}

fn load_from_path(path: &std::path::Path) -> Option<LicenseInfo> {
    let data = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&data).ok()
}

fn save_to_path(path: &std::path::Path, info: &LicenseInfo) {
    if let Ok(data) = serde_json::to_string(info) {
        let _ = std::fs::write(path, data);
    }
}

fn delete_at_path(path: &std::path::Path) {
    let _ = std::fs::remove_file(path);
}

pub(super) fn load_license_file(app: &tauri::AppHandle) -> Option<LicenseInfo> {
    load_from_path(&license_file_path(app)?)
}

pub(super) fn save_license_file(app: &tauri::AppHandle, info: &LicenseInfo) {
    if let Some(path) = license_file_path(app) {
        save_to_path(&path, info);
    }
}

pub(super) fn delete_license_file(app: &tauri::AppHandle) {
    if let Some(path) = license_file_path(app) {
        delete_at_path(&path);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn make_info() -> LicenseInfo {
        LicenseInfo {
            license_key: "XXXX-YYYY-ZZZZ".to_string(),
            instance_id: "abc-123".to_string(),
            activated_at: "2024-01-01T00:00:00Z".to_string(),
        }
    }

    #[test]
    fn save_and_load_round_trip() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("license.json");
        let info = make_info();
        save_to_path(&path, &info);
        let loaded = load_from_path(&path).expect("should load saved license");
        assert_eq!(loaded.license_key, info.license_key);
        assert_eq!(loaded.instance_id, info.instance_id);
        assert_eq!(loaded.activated_at, info.activated_at);
    }

    #[test]
    fn load_missing_file_returns_none() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("does_not_exist.json");
        assert!(load_from_path(&path).is_none());
    }

    #[test]
    fn load_invalid_json_returns_none() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("bad.json");
        std::fs::write(&path, b"not valid json {{{{").unwrap();
        assert!(load_from_path(&path).is_none());
    }

    #[test]
    fn delete_at_path_removes_file() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("license.json");
        save_to_path(&path, &make_info());
        assert!(path.exists());
        delete_at_path(&path);
        assert!(!path.exists());
    }

    #[test]
    fn delete_at_path_missing_file_is_noop() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("nonexistent.json");
        // Must not panic
        delete_at_path(&path);
    }
}
