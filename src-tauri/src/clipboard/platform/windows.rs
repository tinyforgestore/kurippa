/// Enumerate every format on the Windows clipboard and return raw bytes.
///
/// Filters:
/// - Skip formats whose data exceeds 10 MB.
/// - Skip unknown synthesised formats that have no registered name.
pub fn read_all_formats_windows() -> Vec<(String, Vec<u8>)> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::DataExchange::{
        CloseClipboard, EnumClipboardFormats, GetClipboardData, GetClipboardFormatNameA,
        OpenClipboard,
    };
    use windows::Win32::System::Memory::{GlobalLock, GlobalSize, GlobalUnlock};

    const MAX_FORMAT_BYTES: usize = 10 * 1024 * 1024;

    // Built-in CF_* format IDs → canonical names
    fn builtin_name(id: u32) -> Option<&'static str> {
        match id {
            1 => Some("CF_TEXT"),
            2 => Some("CF_BITMAP"),
            3 => Some("CF_METAFILEPICT"),
            4 => Some("CF_SYLK"),
            5 => Some("CF_DIF"),
            6 => Some("CF_TIFF"),
            7 => Some("CF_OEMTEXT"),
            8 => Some("CF_DIB"),
            9 => Some("CF_PALETTE"),
            10 => Some("CF_PENDATA"),
            11 => Some("CF_RIFF"),
            12 => Some("CF_WAVE"),
            13 => Some("CF_UNICODETEXT"),
            14 => Some("CF_ENHMETAFILE"),
            15 => Some("CF_HDROP"),
            16 => Some("CF_LOCALE"),
            17 => Some("CF_DIBV5"),
            _ => None,
        }
    }

    unsafe {
        if OpenClipboard(HWND::default()).is_err() {
            return Vec::new();
        }

        let mut result = Vec::new();
        let mut fmt: u32 = 0;

        loop {
            fmt = EnumClipboardFormats(fmt);
            if fmt == 0 {
                break;
            }

            // Resolve format name
            let name = if let Some(n) = builtin_name(fmt) {
                n.to_string()
            } else {
                let mut buf = [0u8; 256];
                let len = GetClipboardFormatNameA(fmt, &mut buf);
                if len == 0 {
                    continue; // unknown synthesised format — skip
                }
                String::from_utf8_lossy(&buf[..len as usize]).into_owned()
            };

            let handle = match GetClipboardData(fmt) {
                Ok(h) if !h.is_invalid() => h,
                _ => continue,
            };

            let ptr = GlobalLock(handle);
            if ptr.is_null() {
                continue;
            }
            let size = GlobalSize(handle);
            if size > 0 && size <= MAX_FORMAT_BYTES {
                let bytes = std::slice::from_raw_parts(ptr as *const u8, size).to_vec();
                result.push((name, bytes));
            }
            GlobalUnlock(handle);
        }

        let _ = CloseClipboard();
        result
    }
}

/// Write a set of raw format blobs back to the Windows clipboard.
/// Returns `true` if at least one format was written successfully.
pub fn write_all_formats_windows(formats: &[(String, Vec<u8>)]) -> bool {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::DataExchange::{
        CloseClipboard, EmptyClipboard, OpenClipboard, RegisterClipboardFormatA, SetClipboardData,
    };
    use windows::Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE};

    fn builtin_id(name: &str) -> Option<u32> {
        match name {
            "CF_TEXT" => Some(1),
            "CF_BITMAP" => Some(2),
            "CF_METAFILEPICT" => Some(3),
            "CF_SYLK" => Some(4),
            "CF_DIF" => Some(5),
            "CF_TIFF" => Some(6),
            "CF_OEMTEXT" => Some(7),
            "CF_DIB" => Some(8),
            "CF_PALETTE" => Some(9),
            "CF_PENDATA" => Some(10),
            "CF_RIFF" => Some(11),
            "CF_WAVE" => Some(12),
            "CF_UNICODETEXT" => Some(13),
            "CF_ENHMETAFILE" => Some(14),
            "CF_HDROP" => Some(15),
            "CF_LOCALE" => Some(16),
            "CF_DIBV5" => Some(17),
            _ => None,
        }
    }

    if formats.is_empty() {
        return false;
    }

    unsafe {
        if OpenClipboard(HWND::default()).is_err() {
            return false;
        }
        if EmptyClipboard().is_err() {
            let _ = CloseClipboard();
            return false;
        }

        let mut any_written = false;

        for (name, data) in formats {
            let fmt_id = if let Some(id) = builtin_id(name) {
                id
            } else {
                // Registered format — register by name (idempotent)
                let c_name = std::ffi::CString::new(name.as_str()).unwrap_or_default();
                let id = RegisterClipboardFormatA(windows::core::PCSTR(c_name.as_ptr() as _));
                if id == 0 {
                    continue;
                }
                id
            };

            let hmem = match GlobalAlloc(GMEM_MOVEABLE, data.len()) {
                Ok(h) if !h.is_invalid() => h,
                _ => continue,
            };

            let ptr = GlobalLock(hmem);
            if ptr.is_null() {
                continue;
            }
            std::ptr::copy_nonoverlapping(data.as_ptr(), ptr as *mut u8, data.len());
            GlobalUnlock(hmem);

            // SetClipboardData takes ownership of hmem on success
            if SetClipboardData(fmt_id, windows::Win32::Foundation::HANDLE(hmem.0)).is_ok() {
                any_written = true;
            }
        }

        let _ = CloseClipboard();
        any_written
    }
}
