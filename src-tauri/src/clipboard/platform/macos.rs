/// Returns the bundle ID of the currently frontmost application (macOS only).
pub fn frontmost_app_bundle_id() -> Option<String> {
    use objc2_app_kit::NSWorkspace;

    // SAFETY: `sharedWorkspace` and `frontmostApplication` are documented by Apple as
    // safe to call from any thread for read-only access. No mutable ObjC state is
    // touched here; we only read the bundle identifier string.
    unsafe {
        let workspace = NSWorkspace::sharedWorkspace();
        let app = workspace.frontmostApplication()?;
        let bundle_id = app.bundleIdentifier()?;
        Some(bundle_id.to_string())
    }
}

pub fn read_file_paths_macos() -> Vec<std::path::PathBuf> {
    use objc2_app_kit::NSPasteboard;
    use objc2_foundation::NSString;

    unsafe {
        let pb = NSPasteboard::generalPasteboard();
        let items = match pb.pasteboardItems() {
            Some(i) => i,
            None => return Vec::new(),
        };

        let file_url_type = NSString::from_str("public.file-url");
        let public_url_type = NSString::from_str("public.url");

        let mut paths: Vec<std::path::PathBuf> = (0..items.count())
            .filter_map(|idx| {
                let item = items.objectAtIndex(idx);
                let url_str = resolve_item_url_str(&item, &file_url_type, &public_url_type)?;
                parse_file_url(&url_str)
            })
            .collect();

        if paths.is_empty() {
            paths = read_nsfilenames_pboard(&pb);
        }

        paths
    }
}

/// Extracts a `file://` URL string from a pasteboard item, trying multiple
/// representations in priority order.
unsafe fn resolve_item_url_str(
    item: &objc2_app_kit::NSPasteboardItem,
    file_url_type: &objc2_foundation::NSString,
    public_url_type: &objc2_foundation::NSString,
) -> Option<String> {
    // 1. Prefer string representation of public.file-url
    if let Some(s) = item.stringForType(file_url_type).map(|s| s.to_string()) {
        return Some(s);
    }

    // 2. Fall back to raw bytes (Finder stores it as NSData)
    if let Some(s) = item.dataForType(file_url_type).and_then(|data| {
        let bytes = data.bytes();
        if bytes.len() > 4096 { return None; }
        std::str::from_utf8(bytes).ok().map(|s| {
            s.trim_end_matches(|c: char| c == '\0' || c == '\n' || c == '\r').to_string()
        })
    }) {
        return Some(s);
    }

    // 3. Last resort: public.url (Finder fallback), only accept file:// URLs
    item.stringForType(public_url_type)
        .map(|s| s.to_string())
        .filter(|s| s.len() <= 4096 && s.starts_with("file://"))
}

/// Parses and validates a `file://` URL string into a [`PathBuf`].
/// Rejects non-local authorities, null bytes, and macOS inode-reference URLs.
fn parse_file_url(url: &str) -> Option<std::path::PathBuf> {
    let path_part = url.strip_prefix("file://")?;

    // Reject file://hostname/path — only accept file:///path (empty authority)
    if !path_part.starts_with('/') {
        return None;
    }

    let decoded = percent_decode_path(path_part);

    if decoded.contains('\0') || decoded.starts_with("/.file/") {
        return None;
    }

    Some(std::path::PathBuf::from(decoded))
}

/// Reads paths from `NSFilenamesPboardType`, the property-list written by
/// Finder's native ⌘C (an `NSArray<NSString>` of absolute paths).
unsafe fn read_nsfilenames_pboard(pb: &objc2_app_kit::NSPasteboard) -> Vec<std::path::PathBuf> {
    use objc2::rc::Retained;
    use objc2_foundation::{NSArray, NSString};

    let filenames_type = NSString::from_str("NSFilenamesPboardType");
    let plist = match pb.propertyListForType(&filenames_type) {
        Some(p) => p,
        None => return Vec::new(),
    };

    let class_name = plist.class().name();
    if !class_name.contains("Array") {
        return Vec::new();
    }

    let array: Retained<NSArray<NSString>> = Retained::cast(plist);
    (0..array.count())
        .map(|i| array.objectAtIndex(i).to_string())
        .filter(|s| !s.contains('\0') && !s.starts_with("/.file/"))
        .map(std::path::PathBuf::from)
        .collect()
}

/// Decode percent-encoded URL path bytes into a String.
/// Handles multi-byte UTF-8 sequences correctly.
fn percent_decode_path(s: &str) -> String {
    let mut bytes = Vec::with_capacity(s.len());
    let input = s.as_bytes();
    let mut i = 0;
    while i < input.len() {
        if input[i] == b'%' && i + 2 < input.len() {
            if let (Some(hi), Some(lo)) = (hex_nibble(input[i + 1]), hex_nibble(input[i + 2])) {
                bytes.push((hi << 4) | lo);
                i += 3;
                continue;
            }
        }
        bytes.push(input[i]);
        i += 1;
    }
    String::from_utf8_lossy(&bytes).into_owned()
}

fn hex_nibble(b: u8) -> Option<u8> {
    match b {
        b'0'..=b'9' => Some(b - b'0'),
        b'a'..=b'f' => Some(b - b'a' + 10),
        b'A'..=b'F' => Some(b - b'A' + 10),
        _ => None,
    }
}

/// Enumerate every format on the current macOS pasteboard and return raw bytes.
///
/// Filters:
/// - Skip `org.nspasteboard.ConcealedType` (password manager concealed marker).
/// - Skip `public.file-url` and `NSFilenamesPboardType` (handled by dedicated code).
/// - Skip any format whose data exceeds 10 MB.
pub fn read_all_formats_macos() -> Vec<(String, Vec<u8>)> {
    use objc2_app_kit::NSPasteboard;
    use objc2_foundation::NSString;

    const MAX_FORMAT_BYTES: usize = 10 * 1024 * 1024; // 10 MB

    static SKIP_TYPES: &[&str] = &[
        "org.nspasteboard.ConcealedType",
        "public.file-url",
        "NSFilenamesPboardType",
    ];

    unsafe {
        let pb = NSPasteboard::generalPasteboard();
        let items = match pb.pasteboardItems() {
            Some(i) if i.count() > 0 => i,
            _ => return Vec::new(),
        };
        let item = items.objectAtIndex(0);
        let types = item.types();

        let mut result = Vec::new();
        for i in 0..types.count() {
            let type_str = types.objectAtIndex(i).to_string();
            if SKIP_TYPES.contains(&type_str.as_str()) {
                continue;
            }
            let ns_type = NSString::from_str(&type_str);
            if let Some(data) = item.dataForType(&ns_type) {
                let bytes = data.bytes();
                if bytes.len() <= MAX_FORMAT_BYTES {
                    result.push((type_str, bytes.to_vec()));
                }
            }
        }
        result
    }
}

/// Write a set of raw format blobs back to the macOS pasteboard atomically.
/// Returns `true` on success.
pub fn write_all_formats_macos(formats: &[(String, Vec<u8>)]) -> bool {
    use objc2::runtime::ProtocolObject;
    use objc2_app_kit::{NSPasteboard, NSPasteboardItem, NSPasteboardWriting};
    use objc2_foundation::{NSArray, NSData, NSString};

    if formats.is_empty() {
        return false;
    }

    unsafe {
        let pb = NSPasteboard::generalPasteboard();
        pb.clearContents();

        let pb_item = NSPasteboardItem::new();

        for (type_str, data) in formats {
            let ns_type = NSString::from_str(type_str);
            let ns_data = NSData::with_bytes(data);
            pb_item.setData_forType(&ns_data, &ns_type);
        }

        // Cast NSPasteboardItem (which implements NSPasteboardWriting) to the protocol type.
        let writing: objc2::rc::Retained<ProtocolObject<dyn NSPasteboardWriting>> =
            ProtocolObject::from_retained(pb_item);
        let array = NSArray::from_vec(vec![writing]);
        pb.writeObjects(&array);

        true
    }
}

/// Reads the RTF content from NSPasteboard (macOS only).
pub fn read_rtf_macos() -> Option<String> {
    use objc2_app_kit::{NSPasteboard, NSPasteboardTypeRTF};
    use objc2_foundation::NSString;

    // SAFETY: `generalPasteboard` returns a shared singleton. `dataForType` and
    // `bytes` perform read-only access on the pasteboard contents. The resulting
    // byte slice is valid for the duration of this function because `data` keeps
    // the underlying NSData alive on the stack.
    unsafe {
        let pb = NSPasteboard::generalPasteboard();
        let rtf_type: &NSString = NSPasteboardTypeRTF;
        let data = pb.dataForType(rtf_type)?;
        let bytes = data.bytes();
        // Use lossy conversion so non-UTF-8 RTF bytes are preserved with replacement chars.
        Some(String::from_utf8_lossy(bytes).into_owned())
    }
}

/// Reads the HTML content from NSPasteboard (macOS only).
pub fn read_html_macos() -> Option<String> {
    use objc2_app_kit::{NSPasteboard, NSPasteboardTypeHTML};
    use objc2_foundation::NSString;

    // SAFETY: `generalPasteboard` returns a shared singleton. `dataForType` and
    // `bytes` perform read-only access on the pasteboard contents. The resulting
    // byte slice is valid for the duration of this function because `data` keeps
    // the underlying NSData alive on the stack.
    unsafe {
        let pb = NSPasteboard::generalPasteboard();
        let html_type: &NSString = NSPasteboardTypeHTML;
        let data = pb.dataForType(html_type)?;
        let bytes = data.bytes();
        Some(String::from_utf8_lossy(bytes).into_owned())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hex_nibble_digits() {
        assert_eq!(hex_nibble(b'0'), Some(0));
        assert_eq!(hex_nibble(b'9'), Some(9));
        assert_eq!(hex_nibble(b'a'), Some(10));
        assert_eq!(hex_nibble(b'f'), Some(15));
        assert_eq!(hex_nibble(b'A'), Some(10));
        assert_eq!(hex_nibble(b'F'), Some(15));
        assert_eq!(hex_nibble(b'g'), None);
        assert_eq!(hex_nibble(b'z'), None);
    }

    #[test]
    fn percent_decode_ascii() {
        assert_eq!(percent_decode_path("/Users/test/file%20name.png"), "/Users/test/file name.png");
    }

    #[test]
    fn percent_decode_multibyte_utf8() {
        // "日本語" = %E6%97%A5%E6%9C%AC%E8%AA%9E
        assert_eq!(
            percent_decode_path("%E6%97%A5%E6%9C%AC%E8%AA%9E"),
            "日本語"
        );
    }

    #[test]
    fn percent_decode_no_encoding() {
        assert_eq!(percent_decode_path("/simple/path.png"), "/simple/path.png");
    }

    #[test]
    fn percent_decode_incomplete_escape_passthrough() {
        // Incomplete % sequence should be passed through verbatim.
        assert_eq!(percent_decode_path("abc%2"), "abc%2");
    }

    #[test]
    fn percent_decode_null_byte_passthrough() {
        // %00 decodes to null byte — caller must reject such paths.
        let result = percent_decode_path("file%00.png");
        assert!(result.contains('\0'), "null byte should be present after decode");
    }
}
