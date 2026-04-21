mod hash;
mod image;
pub mod platform;
mod poller;
mod skip;

pub use platform::unix_now;
pub use skip::{make_paste_skip, PasteSkip};
pub use poller::spawn;

pub fn hash_text(s: &str) -> u64 {
    hash::content_hash(s)
}

pub fn hash_image_bytes(b: &[u8]) -> u64 {
    hash::content_hash_bytes(b)
}
