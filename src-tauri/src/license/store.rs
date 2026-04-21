use crate::license::types::LicenseInfo;
use tauri::Manager;

pub(crate) const LICENSE_FILE: &str = "kurippa-license.json";

pub(super) fn license_file_path(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    app.path().app_data_dir().ok().map(|d| d.join(LICENSE_FILE))
}

pub(super) fn load_license_file(app: &tauri::AppHandle) -> Option<LicenseInfo> {
    let path = license_file_path(app)?;
    let data = std::fs::read_to_string(&path).ok()?;
    serde_json::from_str(&data).ok()
}

pub(super) fn save_license_file(app: &tauri::AppHandle, info: &LicenseInfo) {
    if let Some(path) = license_file_path(app) {
        if let Ok(data) = serde_json::to_string(info) {
            let _ = std::fs::write(path, data);
        }
    }
}

pub(super) fn delete_license_file(app: &tauri::AppHandle) {
    if let Some(path) = license_file_path(app) {
        let _ = std::fs::remove_file(path);
    }
}
