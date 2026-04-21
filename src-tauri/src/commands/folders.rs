use super::history::is_safe_image_filename;
use crate::clipboard;
use crate::db::{self, DbState};
use crate::license;
use tauri::Manager;

#[tauri::command]
pub fn get_folders(state: tauri::State<DbState>) -> Result<Vec<db::Folder>, String> {
    let conn = state.lock().map_err(|e| e.to_string())?;
    db::get_folders(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_folder(app: tauri::AppHandle, state: tauri::State<DbState>, name: String) -> Result<db::Folder, String> {
    if !license::is_activated(&app) {
        return Err("trial".into());
    }
    let conn = state.lock().map_err(|e| e.to_string())?;
    let count = db::count_folders(&conn).map_err(|e| e.to_string())?;
    if count >= 10 {
        return Err("max_folders_reached".to_string());
    }
    let now = clipboard::unix_now();
    db::create_folder(&conn, &name, now).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_folder(app: tauri::AppHandle, state: tauri::State<DbState>, id: i64, name: String) -> Result<(), String> {
    if !license::is_activated(&app) {
        return Err("trial".into());
    }
    let conn = state.lock().map_err(|e| e.to_string())?;
    db::rename_folder(&conn, id, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_folder(
    app: tauri::AppHandle,
    state: tauri::State<DbState>,
    id: i64,
    delete_items: bool,
) -> Result<(), String> {
    if !license::is_activated(&app) {
        return Err("trial".into());
    }
    let image_paths = {
        let conn = state.lock().map_err(|e| e.to_string())?;
        if delete_items {
            db::delete_folder_with_items(&conn, id).map_err(|e| e.to_string())?
        } else {
            db::delete_folder_only(&conn, id).map_err(|e| e.to_string())?;
            vec![]
        }
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
    Ok(())
}

#[tauri::command]
pub fn move_item_to_folder(
    app: tauri::AppHandle,
    state: tauri::State<DbState>,
    item_id: i64,
    folder_id: i64,
) -> Result<(), String> {
    if !license::is_activated(&app) {
        return Err("trial".into());
    }
    let conn = state.lock().map_err(|e| e.to_string())?;
    db::move_item_to_folder(&conn, item_id, folder_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_item_from_folder(
    app: tauri::AppHandle,
    state: tauri::State<DbState>,
    item_id: i64,
) -> Result<(), String> {
    if !license::is_activated(&app) {
        return Err("trial".into());
    }
    let conn = state.lock().map_err(|e| e.to_string())?;
    db::remove_item_from_folder(&conn, item_id).map_err(|e| e.to_string())
}
