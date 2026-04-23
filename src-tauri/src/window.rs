use tauri::{AppHandle, Manager, Monitor, PhysicalPosition, PhysicalSize, WebviewWindow};

const DEFAULT_WIN_W: u32 = 400;
const DEFAULT_WIN_H: u32 = 500;

/// Parse a window position string of the form `[x,y]`.
/// Returns `Some((x, y))` on success, `None` on any parse error.
pub fn parse_window_pos(s: &str) -> Option<(i32, i32)> {
    let s = s.trim().strip_prefix('[')?.strip_suffix(']')?;
    let mut parts = s.splitn(2, ',');
    let x = parts.next()?.trim().parse::<i32>().ok()?;
    let y = parts.next()?.trim().parse::<i32>().ok()?;
    Some((x, y))
}

/// Reads a saved window position from `<app_data_dir>/window_pos.json`.
/// File format: `[x,y]` (two comma-separated i32s inside square brackets).
pub fn load_window_pos(app: &AppHandle) -> Option<(i32, i32)> {
    let path = app.path().app_data_dir().ok()?.join("window_pos.json");
    let s = std::fs::read_to_string(path).ok()?;
    parse_window_pos(&s)
}

/// A monitor rectangle with its scale factor — a plain data type that does not
/// require a live Tauri runtime, making it usable in unit tests.
#[derive(Debug, Clone, PartialEq)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub w: u32,
    pub h: u32,
    pub scale: f64,
}

impl From<&Monitor> for Rect {
    fn from(m: &Monitor) -> Self {
        let p = m.position();
        let s = m.size();
        Rect {
            x: p.x,
            y: p.y,
            w: s.width,
            h: s.height,
            scale: m.scale_factor(),
        }
    }
}

/// Clamps (x, y) so that a window of `win_w × win_h` stays fully within `rect`.
pub fn clamp_to_rect(x: i32, y: i32, win_w: u32, win_h: u32, rect: &Rect) -> PhysicalPosition<i32> {
    let max_x = (rect.x + rect.w as i32 - win_w as i32).max(rect.x);
    let max_y = (rect.y + rect.h as i32 - win_h as i32).max(rect.y);
    PhysicalPosition::new(x.clamp(rect.x, max_x), y.clamp(rect.y, max_y))
}

/// Returns true iff a window of `(win_w × win_h)` placed at `(x, y)` fits
/// entirely within at least one `Rect` in `rects`.
pub fn pos_is_safe_rects(x: i32, y: i32, win_w: u32, win_h: u32, rects: &[Rect]) -> bool {
    rects.iter().any(|r| {
        x >= r.x
            && y >= r.y
            && x.saturating_add(win_w as i32) <= r.x + r.w as i32
            && y.saturating_add(win_h as i32) <= r.y + r.h as i32
    })
}

/// Writes the window position to `<app_data_dir>/window_pos.json`.
pub fn save_window_pos(app: &AppHandle, x: i32, y: i32) {
    if let Ok(dir) = app.path().app_data_dir() {
        let _ = std::fs::write(dir.join("window_pos.json"), format!("[{},{}]", x, y));
    }
}

/// Returns true iff a window of `(win_w × win_h)` placed at `(x, y)` fits
/// entirely within at least one monitor's bounds.
pub fn pos_is_safe(x: i32, y: i32, win_w: u32, win_h: u32, monitors: &[Monitor]) -> bool {
    let rects: Vec<Rect> = monitors.iter().map(Rect::from).collect();
    pos_is_safe_rects(x, y, win_w, win_h, &rects)
}

pub fn toggle_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    let visible = window.is_visible().unwrap_or(false);

    if visible {
        if let Ok(pos) = window.outer_position() {
            save_window_pos(app, pos.x, pos.y);
        }
        let _ = window.hide();
    } else {
        position_window(app, &window);
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Clamps (x, y) so that a window of `win_w × win_h` stays fully within monitor `m`.
/// Thin adapter over `clamp_to_rect` that converts a `&Monitor` to `Rect`.
fn clamp_to_monitor(x: i32, y: i32, win_w: u32, win_h: u32, m: &Monitor) -> PhysicalPosition<i32> {
    clamp_to_rect(x, y, win_w, win_h, &Rect::from(m))
}

const DEFAULT_SPAWN_Y_RATIO: f64 = 0.30;

/// Chooses and applies the spawn position for the popup window.
///
/// Priority:
///   1. Cursor's current monitor — window centred horizontally at DEFAULT_SPAWN_Y_RATIO from top.
///   2. Saved position from disk — used as-is if it fits, or clamped to its monitor.
///   3. First available monitor (same centering), or (50, 50) if none reported.
pub fn position_window(app: &AppHandle, window: &WebviewWindow) {
    let win_size = window.outer_size().unwrap_or(PhysicalSize::new(DEFAULT_WIN_W, DEFAULT_WIN_H));
    let win_w = win_size.width;
    let win_h = win_size.height;

    let monitors: Vec<Monitor> = app.available_monitors().unwrap_or_default();

    // Helper: find the monitor whose PHYSICAL bounds contain (px, py).
    let monitor_at_phys = |px: f64, py: f64| -> Option<&Monitor> {
        monitors.iter().find(|m| {
            let p = m.position();
            let s = m.size();
            px >= p.x as f64
                && px < (p.x + s.width as i32) as f64
                && py >= p.y as f64
                && py < (p.y + s.height as i32) as f64
        })
    };

    // Priority 1: center on cursor's monitor at DEFAULT_SPAWN_Y_RATIO.
    let cursor_target = app
        .cursor_position()
        .ok()
        .and_then(|c| monitor_at_phys(c.x, c.y));

    if let Some(m) = cursor_target {
        let p = m.position();
        let s = m.size();
        let x = p.x + (s.width as i32 - win_w as i32) / 2;
        let y = p.y + (s.height as f64 * DEFAULT_SPAWN_Y_RATIO) as i32;
        let _ = window.set_position(clamp_to_monitor(x, y, win_w, win_h, m));
        return;
    }

    // Priority 2: use saved position from disk (physical coords).
    if let Some((sx, sy)) = load_window_pos(app) {
        if pos_is_safe(sx, sy, win_w, win_h, &monitors) {
            let _ = window.set_position(PhysicalPosition::new(sx, sy));
            return;
        }
        let cx = sx as f64 + win_w as f64 / 2.0;
        let cy = sy as f64 + win_h as f64 / 2.0;
        if let Some(m) = monitor_at_phys(cx, cy) {
            let _ = window.set_position(clamp_to_monitor(sx, sy, win_w, win_h, m));
            return;
        }
    }

    // Fallback: first available monitor.
    let spawn_pos = match monitors.first() {
        Some(m) => {
            let p = m.position();
            let s = m.size();
            let x = p.x + (s.width as i32 - win_w as i32) / 2;
            let y = p.y + (s.height as f64 * DEFAULT_SPAWN_Y_RATIO) as i32;
            clamp_to_monitor(x, y, win_w, win_h, m)
        }
        None => {
            log::warn!("position_window: no monitors reported, falling back to (50,50)");
            PhysicalPosition::new(50, 50)
        }
    };
    let _ = window.set_position(spawn_pos);
}

#[cfg(test)]
mod tests {
    use super::*;

    // ------------------------------------------------------------------ //
    // parse_window_pos
    // ------------------------------------------------------------------ //

    #[test]
    fn parse_window_pos_valid() {
        assert_eq!(parse_window_pos("[100,200]"), Some((100, 200)));
    }

    #[test]
    fn parse_window_pos_with_spaces() {
        assert_eq!(parse_window_pos("[ -5 , 300 ]"), Some((-5, 300)));
    }

    #[test]
    fn parse_window_pos_empty_brackets() {
        assert_eq!(parse_window_pos("[]"), None);
    }

    #[test]
    fn parse_window_pos_no_brackets() {
        assert_eq!(parse_window_pos("100,200"), None);
    }

    #[test]
    fn parse_window_pos_single_value() {
        assert_eq!(parse_window_pos("[100]"), None);
    }

    #[test]
    fn parse_window_pos_non_numeric() {
        assert_eq!(parse_window_pos("[abc,def]"), None);
    }

    #[test]
    fn parse_window_pos_overflow() {
        // i32::MAX + 1 = 2147483648 — exceeds i32 range
        assert_eq!(parse_window_pos("[2147483648,0]"), None);
    }

    // ------------------------------------------------------------------ //
    // clamp_to_rect
    // ------------------------------------------------------------------ //

    fn make_rect(x: i32, y: i32, w: u32, h: u32) -> Rect {
        Rect { x, y, w, h, scale: 1.0 }
    }

    #[test]
    fn clamp_to_rect_fits_fully_unchanged() {
        let rect = make_rect(0, 0, 1920, 1080);
        let pos = clamp_to_rect(100, 100, 400, 500, &rect);
        assert_eq!(pos.x, 100);
        assert_eq!(pos.y, 100);
    }

    #[test]
    fn clamp_to_rect_extends_past_right_edge() {
        let rect = make_rect(0, 0, 1920, 1080);
        // 1800 + 400 = 2200 > 1920 → clamp to 1920 - 400 = 1520
        let pos = clamp_to_rect(1800, 100, 400, 500, &rect);
        assert_eq!(pos.x, 1520);
        assert_eq!(pos.y, 100);
    }

    #[test]
    fn clamp_to_rect_extends_past_bottom_edge() {
        let rect = make_rect(0, 0, 1920, 1080);
        // 700 + 500 = 1200 > 1080 → clamp to 1080 - 500 = 580
        let pos = clamp_to_rect(100, 700, 400, 500, &rect);
        assert_eq!(pos.x, 100);
        assert_eq!(pos.y, 580);
    }

    #[test]
    fn clamp_to_rect_window_larger_than_monitor() {
        // Window bigger than monitor → clamp to monitor origin
        let rect = make_rect(0, 0, 300, 200);
        let pos = clamp_to_rect(50, 50, 400, 500, &rect);
        assert_eq!(pos.x, 0);
        assert_eq!(pos.y, 0);
    }

    #[test]
    fn clamp_to_rect_negative_position() {
        let rect = make_rect(0, 0, 1920, 1080);
        let pos = clamp_to_rect(-50, -100, 400, 500, &rect);
        assert_eq!(pos.x, 0);
        assert_eq!(pos.y, 0);
    }

    #[test]
    fn clamp_to_rect_non_zero_monitor_origin() {
        // Second monitor starts at x=1920
        let rect = make_rect(1920, 0, 1920, 1080);
        // Position before the monitor's left edge → clamped to x=1920
        let pos = clamp_to_rect(1800, 100, 400, 500, &rect);
        assert_eq!(pos.x, 1920);
        assert_eq!(pos.y, 100);
    }

    // ------------------------------------------------------------------ //
    // pos_is_safe_rects
    // ------------------------------------------------------------------ //

    #[test]
    fn pos_is_safe_rects_fits_first_monitor() {
        let rects = vec![make_rect(0, 0, 1920, 1080), make_rect(1920, 0, 1920, 1080)];
        assert!(pos_is_safe_rects(100, 100, 400, 500, &rects));
    }

    #[test]
    fn pos_is_safe_rects_fits_second_monitor() {
        let rects = vec![make_rect(0, 0, 1920, 1080), make_rect(1920, 0, 1920, 1080)];
        assert!(pos_is_safe_rects(2000, 100, 400, 500, &rects));
    }

    #[test]
    fn pos_is_safe_rects_off_all_monitors() {
        let rects = vec![make_rect(0, 0, 1920, 1080)];
        // Way off to the right
        assert!(!pos_is_safe_rects(5000, 100, 400, 500, &rects));
    }

    #[test]
    fn pos_is_safe_rects_partially_off_edge() {
        let rects = vec![make_rect(0, 0, 1920, 1080)];
        // Window at x=1700 with width=400 → right edge at 2100 > 1920
        assert!(!pos_is_safe_rects(1700, 100, 400, 500, &rects));
    }

    #[test]
    fn pos_is_safe_rects_empty_list() {
        assert!(!pos_is_safe_rects(0, 0, 400, 500, &[]));
    }
}
