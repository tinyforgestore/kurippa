use crate::db::{self, ClipboardItem, DbState};
use crate::license;
use arboard::Clipboard;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use super::{hash, image, platform};
use super::skip::{check_and_clear_image_skip, check_and_clear_text_skip, PasteSkip};

const POLL_INTERVAL: Duration = Duration::from_millis(500);
/// Maximum pixel count (width × height) for a clipboard image; images exceeding
/// this are skipped to avoid memory pressure and slow PNG encodes.
const MAX_IMAGE_PIXELS: usize = 12_000_000;
const WAL_CHECKPOINT_INTERVAL: u32 = 200;

/// The kind of content found on the clipboard during a single poll tick.
#[derive(Debug, PartialEq)]
pub enum ClipboardKind {
    Text,
    Image,
    Empty,
}

/// Returns true when an image's pixel count exceeds `cap`.
pub fn image_exceeds_cap(width: usize, height: usize, cap: usize) -> bool {
    width * height > cap
}

/// Returns true when `write_count` is a multiple of `interval` (including zero).
pub fn should_checkpoint(write_count: u32, interval: u32) -> bool {
    write_count % interval == 0
}

/// Classifies clipboard content from the perspective of the poll loop.
/// Text wins over image when both are present.
pub fn classify_clipboard_content(text: Option<&str>, has_image: bool) -> ClipboardKind {
    let text_empty = text.map(|t| t.is_empty()).unwrap_or(true);
    if !text_empty {
        ClipboardKind::Text
    } else if has_image {
        ClipboardKind::Image
    } else {
        ClipboardKind::Empty
    }
}

/// Tracks the last successfully stored clipboard item for deduplication.
enum LastCapture {
    None,
    Text(u64),
    Image(u64),   // hash of image bytes
    FileUrl(u64), // hash of sorted file path strings
}

/// Spawn the clipboard polling loop on a background thread.
pub fn spawn(app: AppHandle, db: DbState, paste_skip: PasteSkip) {
    std::thread::spawn(move || {
        let mut clipboard = match Clipboard::new() {
            Ok(c) => c,
            Err(e) => {
                eprintln!("[clipboard] failed to open clipboard: {e}");
                return;
            }
        };

        // Prime last_capture from the current clipboard so the first poll tick
        // doesn't re-insert whatever is already in the clipboard at startup.
        // Without this, items deleted in a previous session reappear on restart
        // because the content is still present in the clipboard.
        let mut last_capture = {
            let text = clipboard.get_text().ok().filter(|t| !t.is_empty());
            if let Some(ref t) = text {
                LastCapture::Text(hash::content_hash(t))
            } else if let Ok(img) = clipboard.get_image() {
                LastCapture::Image(hash::content_hash_bytes(&img.bytes))
            } else {
                LastCapture::None
            }
        };
        let mut consecutive_rename_failures: u32 = 0;
        let mut write_count: u32 = 0;

        loop {
            std::thread::sleep(POLL_INTERVAL);

            // --- file URL detection (macOS only) ---
            #[cfg(target_os = "macos")]
            let detected_paths = platform::read_file_paths_macos();
            #[cfg(not(target_os = "macos"))]
            let detected_paths: Vec<std::path::PathBuf> = Vec::new();

            if !detected_paths.is_empty() {
                // Dedup: hash the sorted list of all detected paths up-front,
                // before the image filter. This prevents non-image file URLs
                // (e.g. a lingering non-image Finder selection) from calling
                // is_image_path on every tick.
                let mut all_paths_strs: Vec<String> = detected_paths
                    .iter()
                    .map(|p| p.to_string_lossy().into_owned())
                    .collect();
                all_paths_strs.sort();
                let url_hash = hash::content_hash(&all_paths_strs.join("\n"));

                if let LastCapture::FileUrl(prev) = last_capture {
                    if url_hash == prev {
                        continue;
                    }
                }
            }

            // Only intercept if at least one path is an image extension.
            let image_paths: Vec<&std::path::PathBuf> = detected_paths
                .iter()
                .filter(|p| image::is_image_path(p))
                .collect();

            if !image_paths.is_empty() {
                let mut all_paths_strs: Vec<String> = detected_paths
                    .iter()
                    .map(|p| p.to_string_lossy().into_owned())
                    .collect();
                all_paths_strs.sort();
                let url_hash = hash::content_hash(&all_paths_strs.join("\n"));

                // Source app (macOS only)
                #[cfg(target_os = "macos")]
                let source_app = platform::frontmost_app_bundle_id();
                #[cfg(not(target_os = "macos"))]
                let source_app: Option<String> = None;

                let mut any_committed = false;

                'file_paths: for path in &image_paths {
                    let now = platform::unix_now();
                    let path_str = path.to_string_lossy().into_owned();
                    let path_hash = hash::content_hash(&path_str);

                    match image::prepare_image_from_path(&app, path, now, path_hash) {
                        Some(pending) => {
                            // Store as image item with text = original file path (searchable)
                            let mut item = ClipboardItem {
                                id: 0,
                                kind: "image".to_string(),
                                text: Some(path_str.clone()),
                                html: None,
                                rtf: None,
                                image_path: None,
                                source_app: source_app.clone(),
                                created_at: now,
                                pinned: false,
                                folder_id: None,
                                qr_text: None,
                                image_width: None,
                                image_height: None,
                            };

                            let (row_id, evicted_filenames) = {
                                let conn = db.lock().unwrap();
                                match db::insert_item(&conn, &item) {
                                    Ok(result) => result,
                                    Err(e) => {
                                        eprintln!("[clipboard] file-url DB insert error: {e}");
                                        let _ = std::fs::remove_file(&pending.tmp_path);
                                        continue 'file_paths;
                                    }
                                }
                            };

                            item.id = row_id;

                            enum FinalizeOutcome {
                                Success(String),
                                DbErr(rusqlite::Error, std::path::PathBuf),
                                Rename,
                            }

                            let outcome = {
                                let conn = db.lock().unwrap();
                                match image::finalize_image(&conn, row_id, &pending) {
                                    image::FinalizeResult::Ok(final_filename) => {
                                        FinalizeOutcome::Success(final_filename)
                                    }
                                    image::FinalizeResult::DbError(e) => {
                                        // Rename already ran — delete the final file path.
                                        let final_file = pending
                                            .tmp_path
                                            .parent()
                                            .map(|d| d.join(format!("{row_id}.png")))
                                            .unwrap_or_default();
                                        FinalizeOutcome::DbErr(e, final_file)
                                    }
                                    image::FinalizeResult::RenameFailed => FinalizeOutcome::Rename,
                                }
                            };

                            match outcome {
                                FinalizeOutcome::Success(final_filename) => {
                                    item.image_path = Some(final_filename.clone());
                                    item.image_width = Some(pending.width as i64);
                                    item.image_height = Some(pending.height as i64);
                                    consecutive_rename_failures = 0;
                                    any_committed = true;
                                    if license::is_activated(&app) {
                                        if let Some(images_dir) = app.path().app_data_dir().ok().map(|d: std::path::PathBuf| d.join("images")) {
                                            let png_path = images_dir.join(&final_filename);
                                            let png_path_str = png_path.to_string_lossy().into_owned();
                                            // Run QR decode on a blocking thread so the CGEventTap
                                            // callback and clipboard poll loop are not stalled.
                                            let qr_result = tauri::async_runtime::block_on(
                                                tauri::async_runtime::spawn_blocking(move || {
                                                    rxing::helpers::detect_in_file(&png_path_str, None)
                                                        .ok()
                                                        .map(|r| r.getText().to_string())
                                                })
                                            );
                                            if let Ok(Some(qr_text)) = qr_result {
                                                let conn = db.lock().unwrap();
                                                let _ = db::update_qr_text(&conn, row_id, &qr_text);
                                                item.qr_text = Some(qr_text);
                                            }
                                        }
                                    }
                                }
                                FinalizeOutcome::DbErr(e, final_file) => {
                                    eprintln!("[clipboard] file-url UPDATE image_path failed for row {row_id}: {e}");
                                    let _ = std::fs::remove_file(&final_file);
                                    let conn = db.lock().unwrap();
                                    let _ = db::delete_item(&conn, row_id);
                                    continue 'file_paths;
                                }
                                FinalizeOutcome::Rename => {
                                    let _ = std::fs::remove_file(&pending.tmp_path);
                                    let conn = db.lock().unwrap();
                                    let _ = db::delete_item(&conn, row_id);
                                    consecutive_rename_failures += 1;
                                    continue 'file_paths;
                                }
                            }

                            image::cleanup_evicted(&app, &evicted_filenames);

                            if let Err(e) = app.emit("clipboard-updated", &item) {
                                eprintln!("[clipboard] emit error: {e}");
                            }
                        }
                        None => {
                            // File missing, too large, or decode failed — store path as text fallback
                            let mut item = ClipboardItem {
                                id: 0,
                                kind: "text".to_string(),
                                text: Some(path_str.clone()),
                                html: None,
                                rtf: None,
                                image_path: None,
                                source_app: source_app.clone(),
                                created_at: now,
                                pinned: false,
                                folder_id: None,
                                qr_text: None,
                                image_width: None,
                                image_height: None,
                            };
                            let (row_id, evicted) = {
                                let conn = db.lock().unwrap();
                                match db::insert_item(&conn, &item) {
                                    Ok(result) => result,
                                    Err(e) => {
                                        eprintln!("[clipboard] file-url text fallback insert error: {e}");
                                        continue 'file_paths;
                                    }
                                }
                            };
                            item.id = row_id;
                            any_committed = true;
                            image::cleanup_evicted(&app, &evicted);
                            if let Err(e) = app.emit("clipboard-updated", &item) {
                                eprintln!("[clipboard] emit error: {e}");
                            }
                        }
                    }
                }

                if any_committed {
                    last_capture = LastCapture::FileUrl(url_hash);
                    write_count += 1;
                    if should_checkpoint(write_count, WAL_CHECKPOINT_INTERVAL) {
                        let conn = db.lock().unwrap();
                        let _ = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE)");
                    }
                }
                continue; // skip normal text/image detection this iteration
            }

            // --- text ---
            let text = clipboard.get_text().ok();
            let text_is_empty = text.as_deref().unwrap_or("").is_empty();

            // Only attempt image detection when text is absent or empty.
            let image_result = if text_is_empty {
                clipboard.get_image().ok()
            } else {
                None
            };

            // Nothing useful on the clipboard (None or empty string, no image).
            if classify_clipboard_content(text.as_deref(), image_result.is_some()) == ClipboardKind::Empty {
                continue;
            }

            // --- image path ---
            let (image_filename, kind) = if let Some(ref img_data) = image_result {
                // Skip oversized images to avoid memory pressure and slow encodes.
                let (w, h) = (img_data.width, img_data.height);
                if image_exceeds_cap(w, h, MAX_IMAGE_PIXELS) {
                    log::debug!("[clipboard] Skipping oversized clipboard image: {}×{}", w, h);
                    continue;
                }

                let img_hash = hash::content_hash_bytes(&img_data.bytes);

                // Dedup: skip if identical image was last captured.
                if let LastCapture::Image(prev_hash) = last_capture {
                    if img_hash == prev_hash {
                        continue;
                    }
                }

                // Paste-skip: if this image was just written by a paste command, don't re-capture it.
                {
                    let mut skip = paste_skip.lock().unwrap();
                    if check_and_clear_image_skip(&mut skip, img_hash) {
                        // Advance last_capture so the normal dedup check also
                        // suppresses this hash on subsequent ticks without a DB round-trip.
                        last_capture = LastCapture::Image(img_hash);
                        continue;
                    }
                }

                let now = platform::unix_now();
                if let Some(pending) = image::prepare_image(&app, img_data, now, img_hash) {
                    // Do NOT update last_capture here — set it only after a confirmed DB insert.
                    // Store only the filename; full path is reconstructed in Rust.
                    (Some(pending), "image".to_string())
                } else {
                    (None, "text".to_string())
                }
            } else {
                (None, "text".to_string())
            };

            // --- text dedup (only when not capturing an image) ---
            if kind != "image" {
                let hash = hash::content_hash(text.as_deref().unwrap_or(""));
                if let LastCapture::Text(prev) = last_capture {
                    if hash == prev {
                        continue;
                    }
                }
                // Paste-skip: if this text was just written by a paste command, don't re-capture it.
                {
                    let mut skip = paste_skip.lock().unwrap();
                    if check_and_clear_text_skip(&mut skip, hash) {
                        // Advance last_capture so the normal dedup check also
                        // suppresses this hash on subsequent ticks without a DB round-trip.
                        last_capture = LastCapture::Text(hash);
                        continue;
                    }
                }
                // last_capture is updated below after a confirmed DB insert.
            }

            // --- RTF + HTML (macOS only) — only read when not capturing an image ---
            #[cfg(target_os = "macos")]
            let (rtf, html) = if kind != "image" {
                (platform::read_rtf_macos(), platform::read_html_macos())
            } else {
                (None, None)
            };
            #[cfg(not(target_os = "macos"))]
            let (rtf, html): (Option<String>, Option<String>) = (None, None);

            let (final_text, final_kind) = if kind == "image" {
                (None, "image".to_string())
            } else if rtf.is_some() && text.is_some() {
                (text.clone(), "rtf".to_string())
            } else {
                (text.clone(), "text".to_string())
            };

            // --- source app (macOS only) ---
            #[cfg(target_os = "macos")]
            let source_app = platform::frontmost_app_bundle_id();
            #[cfg(not(target_os = "macos"))]
            let source_app: Option<String> = None;

            // For image items the image_path stored in DB is just the filename
            // (e.g. "42.png"); the full path is reconstructed from app_data_dir in Rust.
            // We don't know the row id yet, so pass None for now and update after insert.
            let mut item = ClipboardItem {
                id: 0,
                kind: final_kind,
                text: final_text,
                html,
                rtf,
                image_path: None, // filled in after we have the row id
                source_app,
                created_at: platform::unix_now(),
                pinned: false,
                folder_id: None,
                qr_text: None,
                image_width: None,
                image_height: None,
            };

            // Insert into DB and collect any evicted image filenames.
            let (row_id, evicted_filenames) = {
                let conn = db.lock().unwrap();
                match db::insert_item(&conn, &item) {
                    Ok(result) => result,
                    Err(e) => {
                        eprintln!("[clipboard] DB insert error: {e}");
                        // Clean up temp image if present.
                        if let Some(ref pending) = image_filename {
                            let _ = std::fs::remove_file(&pending.tmp_path);
                        }
                        continue;
                    }
                }
            };

            item.id = row_id;

            // If we saved a temp image, rename it to <id>.png and update the DB row.
            if item.kind == "image" {
                if let Some(ref pending) = image_filename {
                    let finalize_result = {
                        let conn = db.lock().unwrap();
                        image::finalize_image(&conn, row_id, pending)
                    };
                    match finalize_result {
                        image::FinalizeResult::Ok(final_filename) => {
                            item.image_path = Some(final_filename.clone());
                            item.image_width = Some(pending.width as i64);
                            item.image_height = Some(pending.height as i64);
                            // Confirmed success — reset failure counter and update dedup state.
                            consecutive_rename_failures = 0;
                            last_capture = LastCapture::Image(pending.hash);
                            if license::is_activated(&app) {
                                if let Some(images_dir) = app.path().app_data_dir().ok().map(|d: std::path::PathBuf| d.join("images")) {
                                    let png_path = images_dir.join(&final_filename);
                                    let png_path_str = png_path.to_string_lossy().into_owned();
                                    // DB lock is already released; run QR decode on a blocking
                                    // thread so other threads are not gated on decode time.
                                    let qr_result = tauri::async_runtime::block_on(
                                        tauri::async_runtime::spawn_blocking(move || {
                                            rxing::helpers::detect_in_file(&png_path_str, None)
                                                .ok()
                                                .map(|r| r.getText().to_string())
                                        })
                                    );
                                    if let Ok(Some(qr_text)) = qr_result {
                                        let conn = db.lock().unwrap();
                                        let _ = db::update_qr_text(&conn, row_id, &qr_text);
                                        item.qr_text = Some(qr_text);
                                    }
                                }
                            }
                        }
                        image::FinalizeResult::DbError(e) => {
                            eprintln!(
                                "[clipboard] UPDATE image_path failed for row {row_id}: {e}"
                            );
                            // The rename already ran; delete the final file.
                            if let Some(parent) = pending.tmp_path.parent() {
                                let _ = std::fs::remove_file(parent.join(format!("{row_id}.png")));
                            }
                            {
                                let conn = db.lock().unwrap();
                                if let Err(de) = db::delete_item(&conn, row_id) {
                                    eprintln!(
                                        "[clipboard] failed to delete orphaned row {row_id}: {de}"
                                    );
                                }
                            }
                            continue;
                        }
                        image::FinalizeResult::RenameFailed => {
                            // Rename failed — remove the temp file and the orphaned DB row.
                            let _ = std::fs::remove_file(&pending.tmp_path);
                            {
                                let conn = db.lock().unwrap();
                                if let Err(e) = db::delete_item(&conn, row_id) {
                                    eprintln!(
                                        "[clipboard] failed to delete orphaned row {row_id}: {e}"
                                    );
                                }
                            }
                            consecutive_rename_failures += 1;
                            if consecutive_rename_failures >= 3 {
                                eprintln!(
                                    "[clipboard] rename failed {} consecutive times for image hash {}; \
                                     suppressing retries for this image",
                                    consecutive_rename_failures, pending.hash
                                );
                                last_capture = LastCapture::Image(pending.hash);
                                consecutive_rename_failures = 0;
                            }
                            continue;
                        }
                    }
                }
            } else {
                // Text/RTF path — update dedup state now that insert succeeded.
                let hash = hash::content_hash(item.text.as_deref().unwrap_or(""));
                last_capture = LastCapture::Text(hash);

                // Capture all raw clipboard formats for faithful multi-format paste.
                // Read formats BEFORE acquiring the DB lock so we don't hold the lock
                // while performing OS clipboard I/O.
                #[cfg(target_os = "macos")]
                let raw_formats = platform::read_all_formats_macos();
                #[cfg(target_os = "windows")]
                let raw_formats = platform::read_all_formats_windows();
                #[cfg(not(any(target_os = "macos", target_os = "windows")))]
                let raw_formats: Vec<(String, Vec<u8>)> = Vec::new();

                if !raw_formats.is_empty() {
                    let conn = db.lock().unwrap();
                    if let Err(e) = db::insert_item_formats(&conn, row_id, &raw_formats) {
                        eprintln!("[clipboard] insert_item_formats failed for row {row_id}: {e}");
                    }
                }
            }

            // Delete files for evicted rows (DB lock already released above).
            image::cleanup_evicted(&app, &evicted_filenames);

            // Emit event to frontend
            if let Err(e) = app.emit("clipboard-updated", &item) {
                eprintln!("[clipboard] emit error: {e}");
            }

            // Periodic WAL checkpoint every 200 writes to prevent unbounded WAL growth.
            write_count += 1;
            if should_checkpoint(write_count, WAL_CHECKPOINT_INTERVAL) {
                let conn = db.lock().unwrap();
                let _ = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE)");
            }
        }
    });
}
