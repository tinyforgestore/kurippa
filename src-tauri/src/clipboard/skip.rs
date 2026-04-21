/// State shared between paste commands and the clipboard poller to prevent
/// a just-pasted item from being re-captured as a new clipboard entry.
#[derive(Default)]
pub struct PasteSkipState {
    /// Hash of the text just written to the clipboard by `paste_item`.
    /// `Some(h)` — skip the next text capture whose hash equals `h`, then clear.
    /// `None` — no skip pending.
    pub text_hash: Option<u64>,
    /// Hash of the raw RGBA image bytes just written by `paste_image_item`.
    /// `Some(h)` — skip the next image capture whose hash equals `h`, then clear.
    /// `None` — no skip pending.
    pub image_hash: Option<u64>,
}

/// Checks whether `hash` matches the pending text skip. If it does, clears
/// the skip and returns `true` (caller should suppress capture). Otherwise
/// returns `false` and leaves state unchanged.
pub(crate) fn check_and_clear_text_skip(state: &mut PasteSkipState, hash: u64) -> bool {
    if state.text_hash == Some(hash) {
        state.text_hash = None;
        return true;
    }
    false
}

/// Same as `check_and_clear_text_skip` but for image byte hashes.
pub(crate) fn check_and_clear_image_skip(state: &mut PasteSkipState, hash: u64) -> bool {
    if state.image_hash == Some(hash) {
        state.image_hash = None;
        return true;
    }
    false
}

pub type PasteSkip = std::sync::Arc<std::sync::Mutex<PasteSkipState>>;

pub fn make_paste_skip() -> PasteSkip {
    PasteSkip::default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn text_skip_fires_and_clears_on_match() {
        let mut state = PasteSkipState { text_hash: Some(42), image_hash: None };
        assert!(check_and_clear_text_skip(&mut state, 42));
        assert_eq!(state.text_hash, None, "should be cleared after match");
    }

    #[test]
    fn text_skip_does_not_fire_on_mismatch() {
        let mut state = PasteSkipState { text_hash: Some(42), image_hash: None };
        assert!(!check_and_clear_text_skip(&mut state, 99));
        assert_eq!(state.text_hash, Some(42), "should be unchanged on mismatch");
    }

    #[test]
    fn text_skip_does_not_fire_when_none() {
        let mut state = PasteSkipState::default();
        assert!(!check_and_clear_text_skip(&mut state, 0));
    }

    #[test]
    fn image_skip_fires_and_clears_on_match() {
        let mut state = PasteSkipState { text_hash: None, image_hash: Some(99) };
        assert!(check_and_clear_image_skip(&mut state, 99));
        assert_eq!(state.image_hash, None);
    }

    #[test]
    fn image_skip_does_not_fire_on_mismatch() {
        let mut state = PasteSkipState { text_hash: None, image_hash: Some(99) };
        assert!(!check_and_clear_image_skip(&mut state, 7));
        assert_eq!(state.image_hash, Some(99));
    }

    #[test]
    fn text_and_image_skips_are_independent() {
        let mut state = PasteSkipState { text_hash: Some(1), image_hash: Some(2) };
        // Matching image skip does not clear text skip
        assert!(check_and_clear_image_skip(&mut state, 2));
        assert_eq!(state.text_hash, Some(1), "text skip should be untouched");
        // Matching text skip does not affect already-cleared image skip
        assert!(check_and_clear_text_skip(&mut state, 1));
        assert_eq!(state.image_hash, None);
    }
}
