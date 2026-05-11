use crate::clipboard::image::{is_safe_image_filename, IMAGES_DIR};
use crate::db::{self, DbState};
use crate::license;
use tauri::Manager;

#[tauri::command]
pub fn get_history(
    app: tauri::AppHandle,
    state: tauri::State<DbState>,
    limit: Option<u32>,
) -> Result<Vec<db::ClipboardItem>, String> {
    let cap = if license::is_activated(&app) { 500 } else { 15 };
    let effective = limit.unwrap_or(50).min(cap);
    let conn = state.lock().map_err(|e| e.to_string())?;
    db::get_history(&conn, effective).map_err(|e| e.to_string())
}

/// Pin a clipboard item by id.
#[tauri::command]
pub fn pin_item(state: tauri::State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.lock().map_err(|e| e.to_string())?;
    db::pin_item(&conn, id).map_err(|e| e.to_string())
}

/// Unpin a clipboard item by id.
#[tauri::command]
pub fn unpin_item(state: tauri::State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.lock().map_err(|e| e.to_string())?;
    db::unpin_item(&conn, id).map_err(|e| e.to_string())
}

/// Delete a clipboard item by id, also removing its image file if present.
#[tauri::command]
pub fn delete_item(
    state: tauri::State<DbState>,
    app: tauri::AppHandle,
    id: i64,
) -> Result<(), String> {
    let image_path = {
        let conn = state.lock().map_err(|e| e.to_string())?;
        db::delete_item_with_path(&conn, id).map_err(|e| e.to_string())?
    };

    if let Some(path_str) = image_path {
        let filename = path_str.as_str();
        if is_safe_image_filename(filename) {
            let images_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| e.to_string())?
                .join(IMAGES_DIR);
            let full_path = images_dir.join(filename);
            // Confirm the resolved path is still inside images_dir.
            if !full_path.starts_with(&images_dir) {
                log::warn!("[delete_item] path escape detected for filename {filename:?}; skipping deletion");
            } else if full_path.exists() {
                std::fs::remove_file(&full_path).map_err(|e| e.to_string())?;
            }
        }
    }

    Ok(())
}

/// Returns the absolute filesystem path for an image file stored in the
/// app's images directory, after the same safety checks as `delete_item`.
#[tauri::command]
pub fn get_image_path(app: tauri::AppHandle, filename: String) -> Result<String, String> {
    if !is_safe_image_filename(&filename) {
        return Err("invalid filename".to_string());
    }
    let images_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join(IMAGES_DIR);
    let full_path = images_dir.join(&filename);
    if !full_path.starts_with(&images_dir) {
        return Err("path traversal denied".to_string());
    }
    full_path
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "non-UTF8 path".to_string())
}
