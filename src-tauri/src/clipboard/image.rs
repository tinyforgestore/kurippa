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
        .map(|d| d.join("images"))
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
        .map(|d| d.join("images"))
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

/// Deletes evicted image files from the images directory.
pub fn cleanup_evicted(app: &tauri::AppHandle, filenames: &[String]) {
    if filenames.is_empty() {
        return;
    }
    if let Ok(images_dir) = app.path().app_data_dir().map(|d| d.join("images")) {
        for filename in filenames {
            // Validate: reject paths that escape the images directory.
            if !filename.contains('/')
                && !filename.contains('\\')
                && !filename.contains('\0')
                && filename.ends_with(".png")
            {
                let _ = std::fs::remove_file(images_dir.join(filename));
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
