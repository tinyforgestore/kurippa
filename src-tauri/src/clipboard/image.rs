use tauri::Manager;

/// Returns true if the file extension (case-insensitive) is a supported image type.
pub fn is_image_path(path: &std::path::Path) -> bool {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase());
    matches!(ext.as_deref(), Some("png" | "jpg" | "jpeg" | "webp" | "gif" | "heic"))
}

/// Reads an image from `source_path`, decodes it, and saves it as a temp PNG.
/// Returns None if the file doesn't exist, is not a regular file (symlink, device, FIFO, etc.),
/// is > 20 MB, exceeds 100 MP, or fails to decode/save.
pub fn prepare_image_from_path(
    app: &tauri::AppHandle,
    source_path: &std::path::Path,
    now: i64,
    path_hash: u64,
) -> Option<PendingImage> {
    const MAX_FILE_SIZE: u64 = 20 * 1024 * 1024; // 20 MB
    const MAX_PIXELS: u64 = 100_000_000;           // 100 MP

    // Reject anything that is not a plain regular file (symlinks, devices, FIFOs, sockets, dirs).
    let symlink_meta = std::fs::symlink_metadata(source_path).ok()?;
    if !symlink_meta.file_type().is_file() {
        return None;
    }

    // Resolve `.` and `..` components. Safe because we already rejected symlinks above.
    let canonical_path = std::fs::canonicalize(source_path).ok()?;

    let metadata = std::fs::metadata(&canonical_path).ok()?;
    if metadata.len() > MAX_FILE_SIZE {
        return None;
    }

    let img = image::open(&canonical_path).ok()?;
    // Reject images larger than 100 MP to prevent decompression bombs.
    if (img.width() as u64) * (img.height() as u64) > MAX_PIXELS {
        return None;
    }
    let (width, height) = (img.width(), img.height());
    let rgba = img.into_rgba8();

    let images_dir = app
        .path()
        .app_data_dir()
        .map(|d| d.join(IMAGES_DIR))
        .ok()?;

    let _ = std::fs::create_dir_all(&images_dir);

    let tmp = images_dir.join(format!("tmp_{}_{}.png", now, path_hash));

    if rgba.save(&tmp).is_ok() {
        Some(PendingImage {
            tmp_path: tmp,
            hash: path_hash,
            width,
            height,
        })
    } else {
        let _ = std::fs::remove_file(&tmp);
        None
    }
}

/// An image that has been decoded and saved as a temp file, awaiting rename to its final name.
/// The temp file at `tmp_path` exists on disk; call `finalize_image` to rename it to `<id>.png`.
pub struct PendingImage {
    pub tmp_path: std::path::PathBuf,
    pub hash: u64,
    pub width: u32,
    pub height: u32,
}

/// Encode raw RGBA image data to PNG and write to disk. Returns true on success.
fn save_image_png(path: &std::path::Path, img: &arboard::ImageData) -> bool {
    use image::{ImageBuffer, RgbaImage};

    let buf: RgbaImage = match ImageBuffer::from_raw(
        img.width as u32,
        img.height as u32,
        img.bytes.to_vec(),
    ) {
        Some(b) => b,
        None => return false,
    };

    buf.save(path).is_ok()
}

/// Creates the images directory, saves a temp PNG, and returns a PendingImage.
/// Returns None if the images dir cannot be resolved or the save fails.
pub fn prepare_image(
    app: &tauri::AppHandle,
    img_data: &arboard::ImageData,
    now: i64,
    img_hash: u64,
) -> Option<PendingImage> {
    let images_dir = app
        .path()
        .app_data_dir()
        .map(|d| d.join(IMAGES_DIR))
        .ok()?;

    let _ = std::fs::create_dir_all(&images_dir);
    let tmp = images_dir.join(format!("tmp_{}.png", now));
    let saved = save_image_png(&tmp, img_data);

    if saved {
        Some(PendingImage {
            tmp_path: tmp,
            hash: img_hash,
            width: img_data.width as u32,
            height: img_data.height as u32,
        })
    } else {
        let _ = std::fs::remove_file(&tmp);
        None
    }
}

/// Result of attempting to rename a temp image to its final DB-row filename.
pub enum FinalizeResult {
    /// Rename succeeded and DB was updated; contains the final filename.
    Ok(String),
    /// Rename failed (temp file was not moved).
    RenameFailed,
    /// Rename succeeded but DB UPDATE failed.
    DbError(rusqlite::Error),
}

/// Renames the temp file to `{row_id}.png` and updates the DB row.
pub fn finalize_image(
    conn: &rusqlite::Connection,
    row_id: i64,
    pending: &PendingImage,
) -> FinalizeResult {
    let final_filename = format!("{row_id}.png");
    let final_path = pending
        .tmp_path
        .parent()
        .map(|d| d.join(&final_filename));

    let rename_ok = if let Some(ref fp) = final_path {
        std::fs::rename(&pending.tmp_path, fp).is_ok()
    } else {
        false
    };

    if !rename_ok {
        return FinalizeResult::RenameFailed;
    }

    match conn.execute(
        "UPDATE items SET image_path = ?1, image_width = ?2, image_height = ?3 WHERE id = ?4",
        rusqlite::params![final_filename, pending.width as i64, pending.height as i64, row_id],
    ) {
        Ok(_) => FinalizeResult::Ok(final_filename),
        Err(e) => FinalizeResult::DbError(e),
    }
}

/// A successfully finalized image, optionally with QR-decoded text.
pub struct FinalizedImage {
    pub final_filename: String,
    pub qr_text: Option<String>,
}

/// Outcome of `finalize_with_optional_qr`. On error variants, callers are
/// responsible for cleaning up the temp/final file and deleting the orphaned row.
pub enum FinalizeWithQrOutcome {
    Ok(FinalizedImage),
    /// DB UPDATE failed after rename; carries the path of the renamed final file
    /// so the caller can remove it.
    DbError(rusqlite::Error, std::path::PathBuf),
    RenameFailed,
}

/// Wraps `finalize_image` with an optional QR-decode step for licensed users.
/// Acquires and releases the DB lock around `finalize_image`, then runs QR
/// decode on a blocking task with no DB lock held, and re-acquires the lock
/// only if a QR string was decoded.
pub fn finalize_with_optional_qr(
    db: &crate::db::DbState,
    app: &tauri::AppHandle,
    row_id: i64,
    pending: &PendingImage,
) -> FinalizeWithQrOutcome {
    let finalize_result = {
        let conn = db.lock().unwrap();
        finalize_image(&conn, row_id, pending)
    };

    match finalize_result {
        FinalizeResult::Ok(final_filename) => {
            let mut qr_text: Option<String> = None;
            if crate::license::is_activated(app) {
                if let Some(images_dir) =
                    app.path().app_data_dir().ok().map(|d: std::path::PathBuf| d.join(IMAGES_DIR))
                {
                    let png_path = images_dir.join(&final_filename);
                    let png_path_str = png_path.to_string_lossy().into_owned();
                    // DB lock is released; run QR decode on a blocking thread so
                    // other threads (incl. the CGEventTap callback) are not gated.
                    let qr_result = tauri::async_runtime::block_on(
                        tauri::async_runtime::spawn_blocking(move || {
                            rxing::helpers::detect_in_file(&png_path_str, None)
                                .ok()
                                .map(|r| r.getText().to_string())
                        }),
                    );
                    if let Ok(Some(text)) = qr_result {
                        let conn = db.lock().unwrap();
                        let _ = crate::db::update_qr_text(&conn, row_id, &text);
                        qr_text = Some(text);
                    }
                }
            }
            FinalizeWithQrOutcome::Ok(FinalizedImage {
                final_filename,
                qr_text,
            })
        }
        FinalizeResult::DbError(e) => {
            let final_file = pending
                .tmp_path
                .parent()
                .map(|d| d.join(format!("{row_id}.png")))
                .unwrap_or_default();
            FinalizeWithQrOutcome::DbError(e, final_file)
        }
        FinalizeResult::RenameFailed => FinalizeWithQrOutcome::RenameFailed,
    }
}

/// Sub-directory under `app_data_dir` that stores clipboard image files.
pub const IMAGES_DIR: &str = "images";

/// Returns true iff `name` is safe to use as an image file path component.
///
/// Rejects strings that contain path separators or null bytes, do not end with
/// `.png`, or match a Windows reserved device name (e.g. `NUL.png`, `CON.png`).
pub fn is_safe_image_filename(name: &str) -> bool {
    if name.is_empty()
        || name.contains('/')
        || name.contains('\\')
        || name.contains('\0')
    {
        return false;
    }
    if !name.ends_with(".png") {
        return false;
    }
    let stem = name.trim_end_matches(".png").to_uppercase();
    let reserved = [
        "CON", "PRN", "AUX", "NUL",
        "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
        "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ];
    !reserved.contains(&stem.as_str())
}

/// Deletes image files for the given filenames, skipping any that fail the
/// safety check or are no longer present on disk. Used for both eviction
/// from the poller and bulk deletion from history/folder commands.
pub fn cleanup_image_files(app: &tauri::AppHandle, filenames: &[String]) {
    if filenames.is_empty() {
        return;
    }
    let Ok(images_dir) = app.path().app_data_dir().map(|d| d.join(IMAGES_DIR)) else {
        return;
    };
    filenames.iter()
        .filter(|f| is_safe_image_filename(f))
        .map(|f| images_dir.join(f))
        .filter(|p| p.starts_with(&images_dir) && p.exists())
        .for_each(|p| { let _ = std::fs::remove_file(p); });
}

#[cfg(test)]
mod tests {
    use super::*;

    // ------------------------------------------------------------------ //
    // is_safe_image_filename
    // ------------------------------------------------------------------ //

    #[test]
    fn safe_filename_numeric_png() {
        assert!(is_safe_image_filename("42.png"));
    }

    #[test]
    fn safe_filename_alpha_png() {
        assert!(is_safe_image_filename("abc.png"));
    }

    #[test]
    fn safe_filename_wrong_extension() {
        assert!(!is_safe_image_filename("42.jpg"));
    }

    #[test]
    fn safe_filename_dotdot_prefix() {
        assert!(!is_safe_image_filename("../42.png"));
    }

    #[test]
    fn safe_filename_forward_slash() {
        assert!(!is_safe_image_filename("dir/42.png"));
    }

    #[test]
    fn safe_filename_backslash() {
        assert!(!is_safe_image_filename("dir\\42.png"));
    }

    #[test]
    fn safe_filename_null_byte() {
        assert!(!is_safe_image_filename("null\042.png"));
    }

    #[test]
    fn safe_filename_empty() {
        assert!(!is_safe_image_filename(""));
    }

    #[test]
    fn safe_filename_dot_png_only() {
        // ".png" has no path separators or null bytes and ends with ".png"
        assert!(is_safe_image_filename(".png"));
    }

    #[test]
    fn safe_filename_rejects_windows_reserved_names() {
        assert!(!is_safe_image_filename("CON.png"));
        assert!(!is_safe_image_filename("nul.png"));
        assert!(!is_safe_image_filename("Com1.png"));
        assert!(!is_safe_image_filename("LPT9.png"));
        assert!(is_safe_image_filename("CONNECT.png"));
    }

    // ------------------------------------------------------------------ //
    // is_image_path
    // ------------------------------------------------------------------ //

    #[test]
    fn is_image_path_accepts_known_extensions() {
        for ext in &["png", "jpg", "jpeg", "webp", "gif", "heic", "PNG", "JPG", "JPEG"] {
            let filename = format!("file.{ext}");
            let p = std::path::Path::new(&filename);
            assert!(is_image_path(p), "expected true for .{ext}");
        }
    }

    #[test]
    fn is_image_path_rejects_unknown_extensions() {
        for ext in &["txt", "pdf", "mp4", "exe", ""] {
            let filename = format!("file.{ext}");
            let p = std::path::Path::new(&filename);
            assert!(!is_image_path(p), "expected false for .{ext}");
        }
    }

    #[test]
    fn is_image_path_rejects_no_extension() {
        assert!(!is_image_path(std::path::Path::new("imagefile")));
    }
}
