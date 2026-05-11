use crate::{events, license};
use tauri::{Emitter, Manager};
use tauri_plugin_store::StoreExt;

#[tauri::command]
pub async fn activate_license_cmd(
    app: tauri::AppHandle,
    key: String,
) -> Result<license::ActivationDetails, String> {
    license::activate_license(&app, &key)
        .await
        .map_err(|e| match e {
            license::LicenseError::InvalidKey => "InvalidKey".to_string(),
            license::LicenseError::DeviceLimitReached => "DeviceLimitReached".to_string(),
            license::LicenseError::NetworkError(msg) => format!("NetworkError: {msg}"),
            license::LicenseError::AlreadyActivated => "AlreadyActivated".to_string(),
            license::LicenseError::Unknown(msg) => format!("Unknown: {msg}"),
        })
}

#[tauri::command]
pub async fn finish_activation_cmd(app: tauri::AppHandle) -> Result<(), String> {
    let store = app.store("app-store.json").map_err(|e| e.to_string())?;
    store.set("just_activated", serde_json::Value::Bool(true));
    store.save().map_err(|e| e.to_string())?;

    app.emit(events::LICENSE_STATE_CHANGED, ()).ok();

    if let Some(win) = app.get_webview_window("activation") {
        let _ = win.hide();
    }
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.set_focus();
    }

    Ok(())
}

#[tauri::command]
pub async fn deactivate_license_cmd(app: tauri::AppHandle) -> Result<(), String> {
    license::deactivate_license(&app)
        .await
        .map_err(|e| match e {
            license::LicenseError::InvalidKey => "InvalidKey".to_string(),
            license::LicenseError::DeviceLimitReached => "DeviceLimitReached".to_string(),
            license::LicenseError::NetworkError(_) => "NetworkError".to_string(),
            license::LicenseError::AlreadyActivated => "AlreadyActivated".to_string(),
            license::LicenseError::Unknown(_) => "Unknown".to_string(),
        })?;

    let store = app.store("app-store.json").map_err(|e| e.to_string())?;
    store.set("trial", serde_json::Value::Bool(true));
    store.delete("license_revoked");
    store.save().map_err(|e| e.to_string())?;

    app.emit(events::LICENSE_STATE_CHANGED, ()).ok();

    Ok(())
}

#[tauri::command]
pub fn is_activated_cmd(app: tauri::AppHandle) -> bool {
    license::is_activated(&app)
}

#[tauri::command]
pub fn get_license_info_cmd(app: tauri::AppHandle) -> Option<license::LicenseInfo> {
    license::get_license_info(&app)
}

#[tauri::command]
pub async fn set_free_trial_cmd(app: tauri::AppHandle) -> Result<(), String> {
    let store = app.store("app-store.json").map_err(|e| e.to_string())?;
    store.set("trial", serde_json::Value::Bool(true));
    store.save().map_err(|e| e.to_string())?;

    if let Some(win) = app.get_webview_window("activation") {
        let _ = win.hide();
    }
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.set_focus();
    }

    Ok(())
}

#[tauri::command]
pub fn show_activation_window(app: tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("activation") {
        let _ = win.show();
        let _ = win.set_focus();
    }
}
