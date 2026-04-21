/// Platform-specific paste-to-previous-window implementation.
///
/// Flow:
///   1. Caller writes the desired text to the system clipboard.
///   2. Caller hides the Kurippa window.
///   3. This module simulates Cmd+V (macOS) / Ctrl+V (Windows) after a short delay
///      so the previously focused app receives the paste keystroke once its window
///      has regained focus.
///
/// The 50 ms delay is intentional: it gives the OS time to restore focus to the
/// previous application after Kurippa's window is hidden.

pub const PASTE_DELAY: std::time::Duration = std::time::Duration::from_millis(50);

// ---------------------------------------------------------------------------
// macOS — simulate Cmd+V via CGEvent
// ---------------------------------------------------------------------------

#[cfg(target_os = "macos")]
pub fn simulate_paste() {
    use core_graphics::event::{CGEvent, CGEventFlags, CGKeyCode};
    use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

    std::thread::sleep(PASTE_DELAY);

    let source = match CGEventSource::new(CGEventSourceStateID::HIDSystemState) {
        Ok(s) => s,
        Err(_) => {
            eprintln!("[paste] failed to create CGEventSource");
            return;
        }
    };

    // key-down for V (key code 9 on macOS)
    let key_v: CGKeyCode = 9;
    let down = match CGEvent::new_keyboard_event(source.clone(), key_v, true) {
        Ok(e) => e,
        Err(_) => {
            eprintln!("[paste] failed to create key-down CGEvent");
            return;
        }
    };
    down.set_flags(CGEventFlags::CGEventFlagCommand);
    down.post(core_graphics::event::CGEventTapLocation::HID);

    // key-up for V
    let up = match CGEvent::new_keyboard_event(source, key_v, false) {
        Ok(e) => e,
        Err(_) => {
            eprintln!("[paste] failed to create key-up CGEvent");
            return;
        }
    };
    up.set_flags(CGEventFlags::CGEventFlagCommand);
    up.post(core_graphics::event::CGEventTapLocation::HID);
}

// ---------------------------------------------------------------------------
// Windows — simulate Ctrl+V via SendInput
// ---------------------------------------------------------------------------

#[cfg(target_os = "windows")]
pub fn simulate_paste() {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS,
        VIRTUAL_KEY, VK_CONTROL, VK_V,
    };

    std::thread::sleep(PASTE_DELAY);

    unsafe {
        let inputs = [
            // Ctrl key down
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VK_CONTROL,
                        wScan: 0,
                        dwFlags: KEYBD_EVENT_FLAGS(0),
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
            // V key down
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VK_V,
                        wScan: 0,
                        dwFlags: KEYBD_EVENT_FLAGS(0),
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
            // V key up
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VK_V,
                        wScan: 0,
                        dwFlags: KEYBD_EVENT_FLAGS(0x0002), // KEYEVENTF_KEYUP
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
            // Ctrl key up
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VK_CONTROL,
                        wScan: 0,
                        dwFlags: KEYBD_EVENT_FLAGS(0x0002), // KEYEVENTF_KEYUP
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
        ];

        let result = SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
        if result != inputs.len() as u32 {
            eprintln!("[paste] SendInput sent fewer events than expected");
        }
    }
}

// ---------------------------------------------------------------------------
// Other platforms — no-op
// ---------------------------------------------------------------------------

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub fn simulate_paste() {
    eprintln!("[paste] paste simulation not supported on this platform");
}
