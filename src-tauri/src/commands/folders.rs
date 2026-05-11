use crate::clipboard::{self, image};
use crate::db::{self, DbState};
use crate::license;

#[tauri::command]
pub fn get_folders(state: tauri::State<DbState>) -> Result<Vec<db::Folder>, String> {
    let conn = state.lock().map_err(|e| e.to_string())?;
    db::get_folders(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_folder(app: tauri::AppHandle, state: tauri::State<DbState>, name: String) -> Result<db::Folder, String> {
    if !license::is_activated(&app) {
        return Err(license::TRIAL_ERROR.into());
    }
    let conn = state.lock().map_err(|e| e.to_string())?;
    let count = db::count_folders(&conn).map_err(|e| e.to_string())?;
    if count >= db::MAX_FOLDERS {
        return Err(db::MAX_FOLDERS_REACHED_ERROR.into());
    }
    let now = clipboard::unix_now();
    db::create_folder(&conn, &name, now).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_folder(app: tauri::AppHandle, state: tauri::State<DbState>, id: i64, name: String) -> Result<(), String> {
    if !license::is_activated(&app) {
        return Err(license::TRIAL_ERROR.into());
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
        return Err(license::TRIAL_ERROR.into());
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
    image::cleanup_image_files(&app, &image_paths);
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
        return Err(license::TRIAL_ERROR.into());
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
        return Err(license::TRIAL_ERROR.into());
    }
    let conn = state.lock().map_err(|e| e.to_string())?;
    db::remove_item_from_folder(&conn, item_id).map_err(|e| e.to_string())
}
