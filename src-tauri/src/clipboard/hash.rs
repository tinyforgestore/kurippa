/// Private helper: hash any `Hash`-able value using `DefaultHasher`.
fn hash_with_default<H: std::hash::Hash + ?Sized>(value: &H) -> u64 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::Hasher;
    let mut h = DefaultHasher::new();
    value.hash(&mut h);
    h.finish()
}

/// Hash of text content — used for deduplication.
pub fn content_hash(text: &str) -> u64 {
    hash_with_default(text)
}

/// Hash of raw bytes — used to dedup image captures.
pub fn content_hash_bytes(bytes: &[u8]) -> u64 {
    hash_with_default(bytes)
}

#[cfg(test)]
mod tests {
    use super::{content_hash, content_hash_bytes};

    #[test]
    fn content_hash_same_text_produces_same_hash() {
        let h1 = content_hash("clipboard content");
        let h2 = content_hash("clipboard content");
        assert_eq!(h1, h2, "identical text must hash to the same value");
    }

    #[test]
    fn content_hash_different_text_produces_different_hash() {
        let h1 = content_hash("foo");
        let h2 = content_hash("bar");
        assert_ne!(h1, h2, "different text must hash to different values");
    }

    #[test]
    fn content_hash_is_case_sensitive() {
        let lower = content_hash("hello");
        let upper = content_hash("HELLO");
        assert_ne!(lower, upper, "hash must be case-sensitive");
    }

    #[test]
    fn content_hash_returns_value_for_empty_string() {
        // An empty string is a valid input — must not panic.
        let _ = content_hash("");
    }

    #[test]
    fn content_hash_bytes_same_input_produces_same_hash() {
        let data = b"image bytes";
        assert_eq!(content_hash_bytes(data), content_hash_bytes(data));
    }

    #[test]
    fn content_hash_bytes_different_input_produces_different_hash() {
        assert_ne!(content_hash_bytes(b"aaa"), content_hash_bytes(b"bbb"));
    }
}
