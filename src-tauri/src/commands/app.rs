use super::history::is_safe_image_filename;
use crate::db::{self, DbState};
use crate::settings;
use std::sync::Mutex;
use tauri::{Emitter, Manager};

pub struct UpdaterState(pub Mutex<Option<tauri_plugin_updater::Update>>);

#[tauri::command]
pub fn open_settings_window(app: tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.show();
        let _ = win.set_focus();
    }
}

/// Clear all non-pinned clipboard history items and their image files.
#[tauri::command]
pub fn clear_history(
    app: tauri::AppHandle,
    state: tauri::State<DbState>,
) -> Result<(), String> {
    let image_paths = {
        let conn = state.lock().map_err(|e| e.to_string())?;
        db::clear_history(&conn).map_err(|e| e.to_string())?
    };
    if let Ok(images_dir) = app.path().app_data_dir().map(|d| d.join("images")) {
        for filename in &image_paths {
            if is_safe_image_filename(filename) {
                let full_path = images_dir.join(filename);
                if full_path.starts_with(&images_dir) && full_path.exists() {
                    let _ = std::fs::remove_file(&full_path);
                }
            }
        }
    }
    let _ = app.emit("history-cleared", ());
    Ok(())
}

/// Quit the application.
#[tauri::command]
pub fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub fn get_settings(app: tauri::AppHandle) -> settings::AppSettings {
    settings::load(&app)
}

#[tauri::command]
pub fn save_settings(app: tauri::AppHandle, s: settings::AppSettings) {
    settings::save(&app, &s);
}

#[tauri::command]
pub fn set_launch_at_login(
    autolaunch: tauri::State<tauri_plugin_autostart::AutoLaunchManager>,
    enabled: bool,
) -> Result<(), String> {
    if enabled {
        autolaunch.enable().map_err(|e| e.to_string())
    } else {
        autolaunch.disable().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn pick_app_bundle(app: tauri::AppHandle) -> Result<Option<settings::IgnoredApp>, String> {
    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        return Ok(None);
    }

    #[cfg(target_os = "macos")]
    {
        use tauri_plugin_dialog::DialogExt;
        let picked = app
            .dialog()
            .file()
            .add_filter("Applications", &["app"])
            .set_directory("/Applications")
            .blocking_pick_file();

        let Some(picked) = picked else {
            return Ok(None);
        };
        let path = picked.as_path().ok_or("invalid path")?;
        let plist_path = path.join("Contents/Info.plist");
        let val: plist::Dictionary =
            plist::from_file(&plist_path).map_err(|e| e.to_string())?;
        let bundle_id = val
            .get("CFBundleIdentifier")
            .and_then(|v| v.as_string())
            .ok_or("missing CFBundleIdentifier")?
            .to_string();
        let display_name = val
            .get("CFBundleDisplayName")
            .or_else(|| val.get("CFBundleName"))
            .and_then(|v| v.as_string())
            .unwrap_or(&bundle_id)
            .to_string();
        Ok(Some(settings::IgnoredApp {
            bundle_id,
            display_name,
        }))
    }
}

#[tauri::command]
pub fn reclamp_main_window(
    app: tauri::AppHandle,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let win = app.get_webview_window("main").ok_or("no main window")?;
    crate::window::reclamp_to_current_monitor(&app, &win, width, height);
    Ok(())
}

#[tauri::command]
pub async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<UpdaterState>();
    let update = state.0.lock().unwrap().take();
    match update {
        Some(u) => u
            .download_and_install(|_, _| {}, || {})
            .await
            .map_err(|e| e.to_string()),
        None => Err("no update pending".to_string()),
    }
}
