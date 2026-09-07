use crate::clipboard::{
    self,
    image::{
        compose_images, compute_layout, finalize_image, is_safe_image_filename, prepare_image,
        FinalizeResult, IMAGES_DIR,
    },
};
use crate::events;
use crate::db::{self, kind, DbState};
use crate::license;
use crate::paste;
use tauri::{Emitter, Manager};

// ── Shared helpers ────────────────────────────────────────────────────────────

/// Touch `item_id` in the DB and emit a `clipboard-updated` event if it exists.
fn touch_and_emit(
    app: &tauri::AppHandle,
    db: &tauri::State<DbState>,
    item_id: Option<i64>,
) -> Result<(), String> {
    if let Some(id) = item_id {
        let now = clipboard::unix_now();
        let updated = {
            let conn = db.lock().map_err(|e| e.to_string())?;
            db::touch_item(&conn, id, now).ok()
        };
        if let Some(item) = updated {
            let _ = app.emit(events::CLIPBOARD_UPDATED, &item);
        }
    }
    Ok(())
}

/// Hide the main window and simulate a paste keystroke on a background thread.
fn hide_and_paste(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
    std::thread::spawn(|| paste::simulate_paste());
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn paste_image_item(
    app: tauri::AppHandle,
    paste_skip: tauri::State<clipboard::PasteSkip>,
    db: tauri::State<DbState>,
    image_filename: String,
    item_id: Option<i64>,
) -> Result<(), String> {
    use arboard::Clipboard;

    if !is_safe_image_filename(&image_filename) {
        return Err("invalid filename".to_string());
    }

    let images_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join(IMAGES_DIR);

    let full_path = images_dir.join(&image_filename);
    if !full_path.starts_with(&images_dir) {
        return Err("path traversal denied".to_string());
    }

    const MAX_FILE_SIZE: u64 = 20 * 1024 * 1024;
    const MAX_PIXELS: u64 = 100_000_000;

    let metadata = std::fs::metadata(&full_path).map_err(|e| e.to_string())?;
    if metadata.len() > MAX_FILE_SIZE {
        return Err("image file too large".to_string());
    }

    let img = image::open(&full_path).map_err(|e| e.to_string())?;
    if (img.width() as u64) * (img.height() as u64) > MAX_PIXELS {
        return Err("image dimensions too large".to_string());
    }
    let rgba = img.into_rgba8();
    let (width, height) = rgba.dimensions();
    let raw_bytes = rgba.into_raw();
    let img_hash = clipboard::hash_image_bytes(&raw_bytes);

    let img_data = arboard::ImageData {
        width: width as usize,
        height: height as usize,
        bytes: raw_bytes.into(),
    };

    Clipboard::new().map_err(|e| e.to_string())?.set_image(img_data).map_err(|e| e.to_string())?;
    paste_skip.lock().unwrap().image_hash = Some(img_hash);

    touch_and_emit(&app, &db, item_id)?;
    hide_and_paste(&app);
    Ok(())
}

#[tauri::command]
pub fn paste_item(
    app: tauri::AppHandle,
    paste_skip: tauri::State<clipboard::PasteSkip>,
    db: tauri::State<DbState>,
    text: String,
    plain_text: bool,
    item_id: Option<i64>,
) -> Result<(), String> {
    let mut wrote_rich = false;
    if !plain_text {
        if let Some(id) = item_id {
            let formats = {
                let conn = db.lock().map_err(|e| e.to_string())?;
                db::get_item_formats(&conn, id).unwrap_or_default()
            };
            if !formats.is_empty() {
                #[cfg(target_os = "macos")]
                { wrote_rich = clipboard::platform::write_all_formats_macos(&formats); }
                #[cfg(target_os = "windows")]
                { wrote_rich = clipboard::platform::write_all_formats_windows(&formats); }
            }
        }
    }

    if !wrote_rich {
        use arboard::Clipboard;
        Clipboard::new().map_err(|e| e.to_string())?.set_text(&text).map_err(|e| e.to_string())?;
    }

    paste_skip.lock().unwrap().text_hash = Some(clipboard::hash_text(&text));
    touch_and_emit(&app, &db, item_id)?;
    hide_and_paste(&app);
    Ok(())
}

#[tauri::command]
pub fn merge_and_paste_items(
    app: tauri::AppHandle,
    paste_skip: tauri::State<clipboard::PasteSkip>,
    db: tauri::State<DbState>,
    item_ids: Vec<i64>,
    separator: String,
) -> Result<(), String> {
    if !license::is_activated(&app) {
        return Err(license::TRIAL_ERROR.into());
    }
    let texts = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        db::get_item_texts(&conn, &item_ids).map_err(|e| e.to_string())?
    };
    if texts.is_empty() {
        return Err("no text items found".to_string());
    }

    let sep = match separator.as_str() {
        "space" => " ",
        "comma" => ", ",
        _ => "\n",
    };
    let merged = texts.join(sep);

    {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let new_item = db::ClipboardItem {
            id: 0,
            kind: kind::TEXT.to_string(),
            text: Some(merged.clone()),
            html: None, rtf: None, image_path: None, source_app: None,
            created_at: clipboard::unix_now(),
            pinned: false, folder_id: None, qr_text: None,
            image_width: None, image_height: None,
        };
        let (new_id, _) = db::insert_item(&conn, &new_item).map_err(|e| e.to_string())?;
        let _ = app.emit(events::CLIPBOARD_UPDATED, db::ClipboardItem { id: new_id, ..new_item });
    }

    {
        use arboard::Clipboard;
        Clipboard::new().map_err(|e| e.to_string())?.set_text(&merged).map_err(|e| e.to_string())?;
    }

    paste_skip.lock().unwrap().text_hash = Some(clipboard::hash_text(&merged));
    hide_and_paste(&app);
    Ok(())
}

#[tauri::command]
pub fn combine_and_paste_images(
    app: tauri::AppHandle,
    paste_skip: tauri::State<clipboard::PasteSkip>,
    db: tauri::State<DbState>,
    item_ids: Vec<i64>,
) -> Result<(), String> {
    use arboard::Clipboard;

    if !license::is_activated(&app) {
        return Err(license::TRIAL_ERROR.into());
    }

    let metas = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        db::get_item_images(&conn, &item_ids).map_err(|e| e.to_string())?
    };
    if metas.is_empty() {
        return Err("no image items found".to_string());
    }

    // Defense-in-depth: reject the combined set before decoding anything if
    // the COMPOSITED CANVAS would exceed the decompression-bomb bound used
    // elsewhere (paste_image_item, prepare_image_from_path). Bounding the sum
    // of source pixels is not enough: compute_layout's grid path uses a
    // uniform cell sized to the max width/height across all images, so e.g.
    // a 10000x200 and a 200x10000 image (4M total source pixels) composite to
    // a 20008x10000 canvas (~200M pixels). Compute the actual canvas size the
    // same way compose_images will, and reject on that.
    const MAX_PIXELS: u64 = 100_000_000;
    let sizes: Vec<(u32, u32)> = metas.iter().map(|m| (m.width, m.height)).collect();
    let (canvas_w, canvas_h, _) = compute_layout(&sizes);
    if (canvas_w as u64) * (canvas_h as u64) > MAX_PIXELS {
        return Err("combined image dimensions too large".to_string());
    }

    let images_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join(IMAGES_DIR);

    const MAX_FILE_SIZE: u64 = 20 * 1024 * 1024;

    let mut decoded: Vec<image::RgbaImage> = Vec::with_capacity(metas.len());
    for meta in &metas {
        if !is_safe_image_filename(&meta.image_path) {
            return Err("invalid filename".to_string());
        }
        let full_path = images_dir.join(&meta.image_path);
        if !full_path.starts_with(&images_dir) {
            return Err("path traversal denied".to_string());
        }
        let metadata = std::fs::metadata(&full_path).map_err(|e| e.to_string())?;
        if metadata.len() > MAX_FILE_SIZE {
            return Err("image file too large".to_string());
        }
        let img = image::open(&full_path).map_err(|e| e.to_string())?;
        decoded.push(img.into_rgba8());
    }

    let composed = compose_images(&decoded);
    let (width, height) = composed.dimensions();
    let raw_bytes = composed.into_raw();
    let img_hash = clipboard::hash_image_bytes(&raw_bytes);

    let img_data = arboard::ImageData {
        width: width as usize,
        height: height as usize,
        bytes: raw_bytes.into(),
    };

    let now = clipboard::unix_now();
    let pending = prepare_image(&app, &img_data, now, img_hash)
        .ok_or_else(|| "failed to prepare combined image".to_string())?;

    let new_item = db::ClipboardItem {
        id: 0,
        kind: kind::IMAGE.to_string(),
        text: None,
        html: None, rtf: None, image_path: None, source_app: None,
        created_at: now,
        pinned: false, folder_id: None, qr_text: None,
        image_width: None, image_height: None,
    };

    let row_id = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let (row_id, _evicted) = db::insert_item(&conn, &new_item).map_err(|e| e.to_string())?;
        row_id
    };

    let finalize_result = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        finalize_image(&conn, row_id, &pending)
    };

    match finalize_result {
        FinalizeResult::Ok(final_filename) => {
            let finalized_item = db::ClipboardItem {
                id: row_id,
                image_path: Some(final_filename),
                image_width: Some(pending.width as i64),
                image_height: Some(pending.height as i64),
                ..new_item
            };
            let _ = app.emit(events::CLIPBOARD_UPDATED, &finalized_item);
        }
        FinalizeResult::RenameFailed => {
            let _ = std::fs::remove_file(&pending.tmp_path);
            {
                let conn = db.lock().map_err(|e| e.to_string())?;
                if let Err(e) = db::delete_item(&conn, row_id) {
                    log::warn!("[paste] failed to delete orphaned row {row_id}: {e}");
                }
            }
            return Err("failed to finalize combined image".to_string());
        }
        FinalizeResult::DbError(e) => {
            let final_file = pending
                .tmp_path
                .parent()
                .map(|d| d.join(format!("{row_id}.png")))
                .unwrap_or_default();
            let _ = std::fs::remove_file(&final_file);
            {
                let conn = db.lock().map_err(|e| e.to_string())?;
                if let Err(de) = db::delete_item(&conn, row_id) {
                    log::warn!("[paste] failed to delete orphaned row {row_id}: {de}");
                }
            }
            return Err(format!("failed to update combined image row: {e}"));
        }
    }

    Clipboard::new().map_err(|e| e.to_string())?.set_image(img_data).map_err(|e| e.to_string())?;
    paste_skip.lock().unwrap().image_hash = Some(img_hash);

    hide_and_paste(&app);
    Ok(())
}
