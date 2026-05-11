use crate::db::{self, kind, ClipboardItem, DbState};
use crate::events;
use arboard::Clipboard;
use tauri::{AppHandle, Emitter};

use super::super::skip::{check_and_clear_image_skip, check_and_clear_text_skip, PasteSkip};
use super::super::{hash, image, platform};
use super::{
    classify_clipboard_content, image_exceeds_cap, should_checkpoint, ClipboardKind, LastCapture,
    PollerState, MAX_IMAGE_PIXELS, WAL_CHECKPOINT_INTERVAL,
};

pub(super) fn handle_regular_branch(
    state: &mut PollerState,
    app: &AppHandle,
    db: &DbState,
    clipboard: &mut Clipboard,
    paste_skip: &PasteSkip,
) {
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
        return;
    }

    // --- image path ---
    let (image_filename, kind) = if let Some(ref img_data) = image_result {
        // Skip oversized images to avoid memory pressure and slow encodes.
        let (w, h) = (img_data.width, img_data.height);
        if image_exceeds_cap(w, h, MAX_IMAGE_PIXELS) {
            log::debug!("[clipboard] Skipping oversized clipboard image: {}×{}", w, h);
            return;
        }

        let img_hash = hash::content_hash_bytes(&img_data.bytes);

        // Dedup: skip if identical image was last captured.
        if let LastCapture::Image(prev_hash) = state.last_capture {
            if img_hash == prev_hash {
                return;
            }
        }

        // Paste-skip: if this image was just written by a paste command, don't re-capture it.
        {
            let mut skip = paste_skip.lock().unwrap();
            if check_and_clear_image_skip(&mut skip, img_hash) {
                // Advance last_capture so the normal dedup check also
                // suppresses this hash on subsequent ticks without a DB round-trip.
                state.last_capture = LastCapture::Image(img_hash);
                return;
            }
        }

        let now = platform::unix_now();
        if let Some(pending) = image::prepare_image(app, img_data, now, img_hash) {
            // Do NOT update last_capture here — set it only after a confirmed DB insert.
            // Store only the filename; full path is reconstructed in Rust.
            (Some(pending), kind::IMAGE.to_string())
        } else {
            (None, kind::TEXT.to_string())
        }
    } else {
        (None, kind::TEXT.to_string())
    };

    // --- text dedup (only when not capturing an image) ---
    if kind != kind::IMAGE {
        let hash = hash::content_hash(text.as_deref().unwrap_or(""));
        if let LastCapture::Text(prev) = state.last_capture {
            if hash == prev {
                return;
            }
        }
        // Paste-skip: if this text was just written by a paste command, don't re-capture it.
        {
            let mut skip = paste_skip.lock().unwrap();
            if check_and_clear_text_skip(&mut skip, hash) {
                // Advance last_capture so the normal dedup check also
                // suppresses this hash on subsequent ticks without a DB round-trip.
                state.last_capture = LastCapture::Text(hash);
                return;
            }
        }
        // last_capture is updated below after a confirmed DB insert.
    }

    // --- RTF + HTML (macOS only) — only read when not capturing an image ---
    let (rtf, html) = if kind != kind::IMAGE {
        platform::read_rtf_html()
    } else {
        (None, None)
    };

    let (final_text, final_kind) = if kind == kind::IMAGE {
        (None, kind::IMAGE.to_string())
    } else if rtf.is_some() && text.is_some() {
        (text.clone(), kind::RTF.to_string())
    } else {
        (text.clone(), kind::TEXT.to_string())
    };

    let source_app = platform::source_app();

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
                log::warn!("[clipboard] DB insert error: {e}");
                // Clean up temp image if present.
                if let Some(ref pending) = image_filename {
                    let _ = std::fs::remove_file(&pending.tmp_path);
                }
                return;
            }
        }
    };

    item.id = row_id;

    // If we saved a temp image, rename it to <id>.png and update the DB row.
    if item.kind == kind::IMAGE {
        if let Some(ref pending) = image_filename {
            match image::finalize_with_optional_qr(db, app, row_id, pending) {
                image::FinalizeWithQrOutcome::Ok(finalized) => {
                    item.image_path = Some(finalized.final_filename.clone());
                    item.image_width = Some(pending.width as i64);
                    item.image_height = Some(pending.height as i64);
                    item.qr_text = finalized.qr_text;
                    // Confirmed success — reset failure counter and update dedup state.
                    state.consecutive_rename_failures = 0;
                    state.last_capture = LastCapture::Image(pending.hash);
                }
                image::FinalizeWithQrOutcome::DbError(e, final_file) => {
                    log::warn!(
                        "[clipboard] UPDATE image_path failed for row {row_id}: {e}"
                    );
                    // The rename already ran; delete the final file.
                    let _ = std::fs::remove_file(&final_file);
                    {
                        let conn = db.lock().unwrap();
                        if let Err(de) = db::delete_item(&conn, row_id) {
                            log::warn!(
                                "[clipboard] failed to delete orphaned row {row_id}: {de}"
                            );
                        }
                    }
                    return;
                }
                image::FinalizeWithQrOutcome::RenameFailed => {
                    // Rename failed — remove the temp file and the orphaned DB row.
                    let _ = std::fs::remove_file(&pending.tmp_path);
                    {
                        let conn = db.lock().unwrap();
                        if let Err(e) = db::delete_item(&conn, row_id) {
                            log::warn!(
                                "[clipboard] failed to delete orphaned row {row_id}: {e}"
                            );
                        }
                    }
                    state.consecutive_rename_failures += 1;
                    if state.consecutive_rename_failures >= 3 {
                        log::warn!(
                            "[clipboard] rename failed {} consecutive times for image hash {}; \
                             suppressing retries for this image",
                            state.consecutive_rename_failures, pending.hash
                        );
                        state.last_capture = LastCapture::Image(pending.hash);
                        state.consecutive_rename_failures = 0;
                    }
                    return;
                }
            }
        }
    } else {
        // Text/RTF path — update dedup state now that insert succeeded.
        let hash = hash::content_hash(item.text.as_deref().unwrap_or(""));
        state.last_capture = LastCapture::Text(hash);

        // Capture all raw clipboard formats for faithful multi-format paste.
        // Read formats BEFORE acquiring the DB lock so we don't hold the lock
        // while performing OS clipboard I/O.
        let raw_formats = platform::read_raw_formats();

        if !raw_formats.is_empty() {
            let conn = db.lock().unwrap();
            if let Err(e) = db::insert_item_formats(&conn, row_id, &raw_formats) {
                log::warn!("[clipboard] insert_item_formats failed for row {row_id}: {e}");
            }
        }
    }

    // Delete files for evicted rows (DB lock already released above).
    image::cleanup_image_files(app, &evicted_filenames);

    // Emit event to frontend
    if let Err(e) = app.emit(events::CLIPBOARD_UPDATED, &item) {
        log::warn!("[clipboard] emit error: {e}");
    }

    // Periodic WAL checkpoint every 200 writes to prevent unbounded WAL growth.
    state.write_count += 1;
    if should_checkpoint(state.write_count, WAL_CHECKPOINT_INTERVAL) {
        let conn = db.lock().unwrap();
        let _ = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE)");
    }
}
