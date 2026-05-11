use crate::db::DbState;
use arboard::Clipboard;
use std::time::Duration;
use tauri::AppHandle;

use super::hash;
use super::skip::PasteSkip;

mod file_url;
mod regular;

use file_url::{handle_file_url_branch, TickOutcome};
use regular::handle_regular_branch;

const POLL_INTERVAL: Duration = Duration::from_millis(500);
/// Maximum pixel count (width × height) for a clipboard image; images exceeding
/// this are skipped to avoid memory pressure and slow PNG encodes.
const MAX_IMAGE_PIXELS: usize = 12_000_000;
const WAL_CHECKPOINT_INTERVAL: u32 = 200;

/// The kind of content found on the clipboard during a single poll tick.
#[derive(Debug, PartialEq)]
enum ClipboardKind {
    Text,
    Image,
    Empty,
}

/// Returns true when an image's pixel count exceeds `cap`.
fn image_exceeds_cap(width: usize, height: usize, cap: usize) -> bool {
    width * height > cap
}

/// Returns true when `write_count` is a multiple of `interval` (including zero).
fn should_checkpoint(write_count: u32, interval: u32) -> bool {
    write_count % interval == 0
}

/// Classifies clipboard content from the perspective of the poll loop.
/// Text wins over image when both are present.
fn classify_clipboard_content(text: Option<&str>, has_image: bool) -> ClipboardKind {
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
pub(super) enum LastCapture {
    None,
    Text(u64),
    Image(u64),   // hash of image bytes
    FileUrl(u64), // hash of sorted file path strings
}

/// Mutable per-thread state for the polling loop.
pub(super) struct PollerState {
    pub last_capture: LastCapture,
    pub consecutive_rename_failures: u32,
    pub write_count: u32,
}

impl PollerState {
    /// Prime `last_capture` from the current clipboard so the first poll tick
    /// doesn't re-insert whatever is already in the clipboard at startup.
    /// Without this, items deleted in a previous session reappear on restart
    /// because the content is still present in the clipboard.
    pub fn primed_from(clipboard: &mut Clipboard) -> Self {
        let last_capture = {
            let text = clipboard.get_text().ok().filter(|t| !t.is_empty());
            if let Some(ref t) = text {
                LastCapture::Text(hash::content_hash(t))
            } else if let Ok(img) = clipboard.get_image() {
                LastCapture::Image(hash::content_hash_bytes(&img.bytes))
            } else {
                LastCapture::None
            }
        };
        Self {
            last_capture,
            consecutive_rename_failures: 0,
            write_count: 0,
        }
    }
}

/// Spawn the clipboard polling loop on a background thread.
pub fn spawn(app: AppHandle, db: DbState, paste_skip: PasteSkip) {
    std::thread::spawn(move || {
        let mut clipboard = match Clipboard::new() {
            Ok(c) => c,
            Err(e) => {
                log::error!("[clipboard] failed to open clipboard: {e}");
                return;
            }
        };

        let mut state = PollerState::primed_from(&mut clipboard);

        loop {
            std::thread::sleep(POLL_INTERVAL);
            match handle_file_url_branch(&mut state, &app, &db) {
                TickOutcome::Handled => continue,
                TickOutcome::ContinueToRegular => {}
            }
            handle_regular_branch(&mut state, &app, &db, &mut clipboard, &paste_skip);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn image_under_cap() {
        assert!(!image_exceeds_cap(1000, 1000, 12_000_000));
    }

    #[test]
    fn image_at_exact_cap() {
        assert!(!image_exceeds_cap(3000, 4000, 12_000_000));
    }

    #[test]
    fn image_just_over_cap() {
        assert!(image_exceeds_cap(3001, 4000, 12_000_000));
    }

    #[test]
    fn image_zero_dimension() {
        assert!(!image_exceeds_cap(0, 999_999, 100));
    }

    #[test]
    fn checkpoint_on_multiple() {
        assert!(should_checkpoint(200, 200));
    }

    #[test]
    fn checkpoint_skips_non_multiple() {
        assert!(!should_checkpoint(201, 200));
    }

    #[test]
    fn checkpoint_on_zero_count() {
        assert!(should_checkpoint(0, 200));
    }

    #[test]
    fn checkpoint_interval_one() {
        assert!(should_checkpoint(7, 1));
    }

    #[test]
    fn classify_text_only() {
        assert_eq!(
            classify_clipboard_content(Some("hello"), false),
            ClipboardKind::Text
        );
    }

    #[test]
    fn classify_text_wins_over_image() {
        assert_eq!(
            classify_clipboard_content(Some("hello"), true),
            ClipboardKind::Text
        );
    }

    #[test]
    fn classify_empty_string_with_image() {
        assert_eq!(
            classify_clipboard_content(Some(""), true),
            ClipboardKind::Image
        );
    }

    #[test]
    fn classify_none_with_image() {
        assert_eq!(
            classify_clipboard_content(None, true),
            ClipboardKind::Image
        );
    }

    #[test]
    fn classify_none_no_image() {
        assert_eq!(
            classify_clipboard_content(None, false),
            ClipboardKind::Empty
        );
    }

    #[test]
    fn classify_empty_string_no_image() {
        assert_eq!(
            classify_clipboard_content(Some(""), false),
            ClipboardKind::Empty
        );
    }
}
