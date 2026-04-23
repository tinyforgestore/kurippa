use std::sync::atomic::{AtomicU32, Ordering};
use tauri::{AppHandle, LogicalPosition, Manager, Monitor, PhysicalPosition, WebviewWindow};

// Cached primary-monitor scale factor × 1000 (macOS only).
// Updated every time position_window finds the primary monitor (pos.x == 0 && pos.y == 0).
// Used as fallback when available_monitors() returns an incomplete list.
#[cfg(target_os = "macos")]
static CACHED_PRIMARY_SCALE_X1000: AtomicU32 = AtomicU32::new(0);

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
            // outer_position() is physical at the window's current scale.
            // Save as logical (AppKit points) so the value is scale-independent.
            let scale = window.scale_factor().unwrap_or(1.0);
            save_window_pos(app, (pos.x as f64 / scale).round() as i32, (pos.y as f64 / scale).round() as i32);
        }
        let _ = window.hide();
    } else {
        position_window(app, &window);
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Returns the logical spawn position (AppKit points) for a window of `(win_lw × win_lh)`
/// on monitor `m`: horizontally centred at `DEFAULT_SPAWN_Y_RATIO` from top, clamped to bounds.
fn spawn_center_logical(m: &Monitor, win_lw: f64, win_lh: f64) -> (f64, f64) {
    let mon_scale = m.scale_factor();
    let p = m.position();
    let s = m.size();
    let mon_lx = p.x as f64 / mon_scale;
    let mon_ly = p.y as f64 / mon_scale;
    let mon_lw = s.width  as f64 / mon_scale;
    let mon_lh = s.height as f64 / mon_scale;
    let lx = mon_lx + (mon_lw - win_lw) / 2.0;
    let ly = mon_ly + mon_lh * DEFAULT_SPAWN_Y_RATIO;
    let max_lx = (mon_lx + mon_lw - win_lw).max(mon_lx);
    let max_ly = (mon_ly + mon_lh - win_lh).max(mon_ly);
    (lx.clamp(mon_lx, max_lx), ly.clamp(mon_ly, max_ly))
}

/// Clamps a logical position so that a window of `(win_lw × win_lh)` stays fully within `m`.
fn clamp_to_monitor_logical(lx: f64, ly: f64, win_lw: f64, win_lh: f64, m: &Monitor) -> (f64, f64) {
    let mon_scale = m.scale_factor();
    let p = m.position();
    let s = m.size();
    let mon_lx = p.x as f64 / mon_scale;
    let mon_ly = p.y as f64 / mon_scale;
    let mon_lw = s.width  as f64 / mon_scale;
    let mon_lh = s.height as f64 / mon_scale;
    let max_lx = (mon_lx + mon_lw - win_lw).max(mon_lx);
    let max_ly = (mon_ly + mon_lh - win_lh).max(mon_ly);
    (lx.clamp(mon_lx, max_lx), ly.clamp(mon_ly, max_ly))
}

/// Returns true iff the logical point (lx, ly) falls within the logical bounds
/// of `rect`, where rect stores physical pixels and scale.
pub fn logical_point_in_rect(lx: f64, ly: f64, rect: &Rect) -> bool {
    let lx0 = rect.x as f64 / rect.scale;
    let ly0 = rect.y as f64 / rect.scale;
    let lw  = rect.w as f64 / rect.scale;
    let lh  = rect.h as f64 / rect.scale;
    lx >= lx0 && lx < lx0 + lw && ly >= ly0 && ly < ly0 + lh
}

const DEFAULT_SPAWN_Y_RATIO: f64 = 0.30;

/// Chooses and applies the spawn position for the popup window.
///
/// All positioning uses `LogicalPosition` (AppKit points) so tao does not apply
/// an extra scale-factor division before handing coordinates to AppKit — using
/// `PhysicalPosition` causes tao to divide by the window's *current* monitor scale
/// before passing to AppKit, which places the window on the wrong screen when the
/// target monitor has a different scale than the one the window is currently on.
///
/// Priority:
///   1. Cursor's current monitor — window centred horizontally at DEFAULT_SPAWN_Y_RATIO from top.
///   2. Saved position from disk (logical coords) — clamped to its monitor.
///   3. First available monitor (same centering), or (50, 50) if none reported.
pub fn position_window(app: &AppHandle, window: &WebviewWindow) {
    let monitors: Vec<Monitor> = app.available_monitors().unwrap_or_default();

    for m in &monitors {
        let p = m.position();
        let s = m.size();
        log::info!("[position_window] monitor {:?} pos=({},{}) size={}x{} scale={}", m.name(), p.x, p.y, s.width, s.height, m.scale_factor());
    }
    if let Ok(c) = app.cursor_position() {
        log::info!("[position_window] cursor_position=({:.1},{:.1})", c.x, c.y);
    }

    // Window logical size: outer_size() is physical at the window's current scale.
    // Use window.scale_factor() (the scale of whichever monitor the pre-warmed window
    // is on) so this is correct regardless of which monitor that happens to be.
    let window_scale = window.scale_factor().unwrap_or(1.0);
    let (win_lw, win_lh) = match window.outer_size() {
        Ok(s) => (s.width as f64 / window_scale, s.height as f64 / window_scale),
        Err(_) => (DEFAULT_WIN_W as f64, DEFAULT_WIN_H as f64),
    };

    // Helper: find the monitor whose PHYSICAL bounds contain (px, py) — Windows path.
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

    // On macOS, cursor_position() returns primary-physical coords (logical × primary_scale).
    // Monitor positions are per-monitor-physical (logical × monitor_scale).
    // Divide cursor by primary_scale to reach AppKit logical, then test against logical
    // monitor bounds via logical_point_in_rect.
    //
    // available_monitors() may return an incomplete list. Cache primary_scale in a static
    // AtomicU32 so detection stays correct when the primary monitor is absent from the list.
    #[cfg(target_os = "macos")]
    let primary_scale = {
        let found = monitors.iter()
            .find(|m| { let p = m.position(); p.x == 0 && p.y == 0 })
            .map(|m| m.scale_factor());
        if let Some(s) = found {
            CACHED_PRIMARY_SCALE_X1000.store((s * 1000.0) as u32, Ordering::Relaxed);
            s
        } else {
            let cached = CACHED_PRIMARY_SCALE_X1000.load(Ordering::Relaxed);
            if cached > 0 { cached as f64 / 1000.0 } else { 1.0 }
        }
    };
    #[cfg(not(target_os = "macos"))]
    let primary_scale = 1.0_f64;

    let monitor_at_logical = |cx: f64, cy: f64| -> Option<&Monitor> {
        let lx = cx / primary_scale;
        let ly = cy / primary_scale;
        monitors.iter().find(|m| logical_point_in_rect(lx, ly, &Rect::from(*m)))
    };

    // Priority 1: center on cursor's monitor at DEFAULT_SPAWN_Y_RATIO.
    #[cfg(target_os = "macos")]
    let cursor_target = app
        .cursor_position()
        .ok()
        .and_then(|c| {
            let r = monitor_at_logical(c.x, c.y);
            log::info!("[position_window] primary_scale={} monitor_at_logical({:.1},{:.1}) → {:?}", primary_scale, c.x / primary_scale, c.y / primary_scale, r.and_then(|m| m.name()));
            r
        });

    #[cfg(not(target_os = "macos"))]
    let cursor_target = app
        .cursor_position()
        .ok()
        .and_then(|c| monitor_at_phys(c.x, c.y));

    if let Some(m) = cursor_target {
        let (lx, ly) = spawn_center_logical(m, win_lw, win_lh);
        log::info!("[position_window] spawn logical=({:.1},{:.1})", lx, ly);
        let _ = window.set_position(LogicalPosition::new(lx, ly));
        return;
    }

    // Priority 2: use saved position from disk (stored as logical coords).
    // Find the monitor whose logical bounds contain the saved window centre, then clamp.
    if let Some((sx, sy)) = load_window_pos(app) {
        let sx_l = sx as f64;
        let sy_l = sy as f64;
        let center_lx = sx_l + win_lw / 2.0;
        let center_ly = sy_l + win_lh / 2.0;
        let saved_monitor = monitors.iter().find(|m| {
            logical_point_in_rect(center_lx, center_ly, &Rect::from(*m))
        });
        if let Some(m) = saved_monitor {
            let (lx, ly) = clamp_to_monitor_logical(sx_l, sy_l, win_lw, win_lh, m);
            let _ = window.set_position(LogicalPosition::new(lx, ly));
            return;
        }
    }

    // Priority 3: first available monitor.
    let (lx, ly) = match monitors.first() {
        Some(m) => spawn_center_logical(m, win_lw, win_lh),
        None => {
            log::warn!("position_window: no monitors reported, falling back to (50,50)");
            (50.0, 50.0)
        }
    };
    let _ = window.set_position(LogicalPosition::new(lx, ly));
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

    // ------------------------------------------------------------------ //
    // logical_point_in_rect
    // ------------------------------------------------------------------ //

    #[test]
    fn logical_point_in_rect_retina_inside() {
        // Physical (0,0,2880x1800) at scale 2.0 → logical (0,0,1440x900)
        let r = Rect { x: 0, y: 0, w: 2880, h: 1800, scale: 2.0 };
        assert!(logical_point_in_rect(720.0, 450.0, &r));
    }

    #[test]
    fn logical_point_in_rect_retina_outside_logical_but_inside_physical() {
        // Physical (0,0,2880x1800) at scale 2.0 → logical (0,0,1440x900)
        // Logical point (1500, 300) is outside logical width 1440, even though 1500 < 2880
        let r = Rect { x: 0, y: 0, w: 2880, h: 1800, scale: 2.0 };
        assert!(!logical_point_in_rect(1500.0, 300.0, &r));
    }

    #[test]
    fn logical_point_in_rect_secondary_scale_1() {
        // Secondary at physical x=2880, scale 1.0 → logical x0=2880, lw=1920
        let r = Rect { x: 2880, y: 0, w: 1920, h: 1080, scale: 1.0 };
        assert!(logical_point_in_rect(3000.0, 100.0, &r));
        assert!(!logical_point_in_rect(2800.0, 100.0, &r));
    }

    #[test]
    fn logical_point_in_rect_scale_1_matches_physical() {
        // When scale=1.0, logical and physical coordinates are identical
        let r = Rect { x: 1920, y: 0, w: 1920, h: 1080, scale: 1.0 };
        assert!(logical_point_in_rect(2000.0, 500.0, &r));
        assert!(!logical_point_in_rect(1000.0, 500.0, &r));
    }
}
