use crate::db::{self, kind, ClipboardItem, DbState};
use crate::events;
use tauri::{AppHandle, Emitter};

use super::super::{hash, image, platform};
use super::{should_checkpoint, LastCapture, PollerState, WAL_CHECKPOINT_INTERVAL};

/// Result of a file-URL branch tick: either it consumed this iteration
/// (Handled — skip the regular text/image branch) or there were no image
/// file URLs and the regular branch should run.
pub(super) enum TickOutcome {
    Handled,
    ContinueToRegular,
}

pub(super) fn handle_file_url_branch(
    state: &mut PollerState,
    app: &AppHandle,
    db: &DbState,
) -> TickOutcome {
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

        if let LastCapture::FileUrl(prev) = state.last_capture {
            if url_hash == prev {
                return TickOutcome::Handled;
            }
        }
    }

    // Only intercept if at least one path is an image extension.
    let image_paths: Vec<&std::path::PathBuf> = detected_paths
        .iter()
        .filter(|p| image::is_image_path(p))
        .collect();

    if image_paths.is_empty() {
        return TickOutcome::ContinueToRegular;
    }

    let mut all_paths_strs: Vec<String> = detected_paths
        .iter()
        .map(|p| p.to_string_lossy().into_owned())
        .collect();
    all_paths_strs.sort();
    let url_hash = hash::content_hash(&all_paths_strs.join("\n"));

    let source_app = platform::source_app();

    let mut any_committed = false;

    'file_paths: for path in &image_paths {
        let now = platform::unix_now();
        let path_str = path.to_string_lossy().into_owned();
        let path_hash = hash::content_hash(&path_str);

        match image::prepare_image_from_path(app, path, now, path_hash) {
            Some(pending) => {
                // Store as image item with text = original file path (searchable)
                let mut item = ClipboardItem {
                    id: 0,
                    kind: kind::IMAGE.to_string(),
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
                            log::warn!("[clipboard] file-url DB insert error: {e}");
                            let _ = std::fs::remove_file(&pending.tmp_path);
                            continue 'file_paths;
                        }
                    }
                };

                item.id = row_id;

                match image::finalize_with_optional_qr(db, app, row_id, &pending) {
                    image::FinalizeWithQrOutcome::Ok(finalized) => {
                        item.image_path = Some(finalized.final_filename.clone());
                        item.image_width = Some(pending.width as i64);
                        item.image_height = Some(pending.height as i64);
                        item.qr_text = finalized.qr_text;
                        state.consecutive_rename_failures = 0;
                        any_committed = true;
                    }
                    image::FinalizeWithQrOutcome::DbError(e, final_file) => {
                        log::warn!(
                            "[clipboard] file-url UPDATE image_path failed for row {row_id}: {e}"
                        );
                        let _ = std::fs::remove_file(&final_file);
                        let conn = db.lock().unwrap();
                        let _ = db::delete_item(&conn, row_id);
                        continue 'file_paths;
                    }
                    image::FinalizeWithQrOutcome::RenameFailed => {
                        let _ = std::fs::remove_file(&pending.tmp_path);
                        let conn = db.lock().unwrap();
                        let _ = db::delete_item(&conn, row_id);
                        state.consecutive_rename_failures += 1;
                        continue 'file_paths;
                    }
                }

                image::cleanup_image_files(app, &evicted_filenames);

                if let Err(e) = app.emit(events::CLIPBOARD_UPDATED, &item) {
                    log::warn!("[clipboard] emit error: {e}");
                }
            }
            None => {
                // File missing, too large, or decode failed — store path as text fallback
                let mut item = ClipboardItem {
                    id: 0,
                    kind: kind::TEXT.to_string(),
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
                            log::warn!("[clipboard] file-url text fallback insert error: {e}");
                            continue 'file_paths;
                        }
                    }
                };
                item.id = row_id;
                any_committed = true;
                image::cleanup_image_files(app, &evicted);
                if let Err(e) = app.emit(events::CLIPBOARD_UPDATED, &item) {
                    log::warn!("[clipboard] emit error: {e}");
                }
            }
        }
    }

    if any_committed {
        state.last_capture = LastCapture::FileUrl(url_hash);
        state.write_count += 1;
        if should_checkpoint(state.write_count, WAL_CHECKPOINT_INTERVAL) {
            let conn = db.lock().unwrap();
            let _ = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE)");
        }
    }
    TickOutcome::Handled // skip normal text/image detection this iteration
}
