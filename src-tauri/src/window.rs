#[cfg(target_os = "macos")]
use std::sync::atomic::{AtomicU32, Ordering};
use tauri::{AppHandle, LogicalPosition, Manager, Monitor, WebviewWindow};

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

/// Writes the window position to `<app_data_dir>/window_pos.json`.
pub fn save_window_pos(app: &AppHandle, x: i32, y: i32) {
    if let Ok(dir) = app.path().app_data_dir() {
        let _ = std::fs::write(dir.join("window_pos.json"), format!("[{},{}]", x, y));
    }
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

/// Pure-data version of `clamp_to_monitor_logical` operating on `Rect` so it
/// can be exercised in unit tests without a live Tauri runtime.
pub fn clamp_to_monitor_logical_rect(lx: f64, ly: f64, win_lw: f64, win_lh: f64, r: &Rect) -> (f64, f64) {
    let mon_lx = r.x as f64 / r.scale;
    let mon_ly = r.y as f64 / r.scale;
    let mon_lw = r.w as f64 / r.scale;
    let mon_lh = r.h as f64 / r.scale;
    let max_lx = (mon_lx + mon_lw - win_lw).max(mon_lx);
    let max_ly = (mon_ly + mon_lh - win_lh).max(mon_ly);
    (lx.clamp(mon_lx, max_lx), ly.clamp(mon_ly, max_ly))
}

/// Clamps a logical position so that a window of `(win_lw × win_lh)` stays fully within `m`.
fn clamp_to_monitor_logical(lx: f64, ly: f64, win_lw: f64, win_lh: f64, m: &Monitor) -> (f64, f64) {
    clamp_to_monitor_logical_rect(lx, ly, win_lw, win_lh, &Rect::from(m))
}

/// Re-clamp the main popup window to the monitor it is currently on.
///
/// Used after the window's size changes (e.g. opening the preview panel widens it
/// from 400 to 720), to nudge it back inside the monitor bounds when the new size
/// would overflow the right or bottom edge. If the window already fits, position
/// is unchanged.
///
/// `win_lw`/`win_lh` are the **target** logical dimensions just requested via
/// `setSize` — passed in as args rather than read from `outer_size()` to avoid
/// a race where the resize hasn't taken effect yet.
pub fn reclamp_to_current_monitor(app: &AppHandle, window: &WebviewWindow, win_lw: f64, win_lh: f64) {
    let pos = match window.outer_position() {
        Ok(p) => p,
        Err(e) => {
            log::warn!("[reclamp] outer_position failed: {e}");
            return;
        }
    };

    let monitors = app.available_monitors().unwrap_or_default();

    // Choose the monitor containing the window's centre. macOS uses logical
    // coordinates (single global space, divided by window scale). Windows /
    // Linux logical spaces are per-monitor and not contiguous, so identify
    // the monitor by physical centre, then derive logical coords using THAT
    // monitor's scale factor for the clamp math.
    #[cfg(target_os = "macos")]
    let chosen: Option<(&Monitor, f64, f64, f64, f64)> = {
        let scale = window.scale_factor().unwrap_or(1.0);
        let cur_lx = pos.x as f64 / scale;
        let cur_ly = pos.y as f64 / scale;
        let center_lx = cur_lx + win_lw / 2.0;
        let center_ly = cur_ly + win_lh / 2.0;
        monitors
            .iter()
            .find(|m| logical_point_in_rect(center_lx, center_ly, &Rect::from(*m)))
            .map(|m| (m, cur_lx, cur_ly, win_lw, win_lh))
    };

    #[cfg(not(target_os = "macos"))]
    let chosen: Option<(&Monitor, f64, f64, f64, f64)> = {
        // Compute physical centre from the *target* logical dims × window scale,
        // not from `outer_size()`. Reading outer_size races with the pending
        // setSize that just preceded this call. Mirrors the macOS branch.
        let win_scale = window.scale_factor().unwrap_or(1.0);
        let phys_w = win_lw * win_scale;
        let phys_h = win_lh * win_scale;
        let center_px = pos.x as f64 + phys_w / 2.0;
        let center_py = pos.y as f64 + phys_h / 2.0;
        let m = monitors.iter().find(|m| {
            let p = m.position();
            let s = m.size();
            center_px >= p.x as f64
                && center_px < (p.x + s.width as i32) as f64
                && center_py >= p.y as f64
                && center_py < (p.y + s.height as i32) as f64
        });
        m.map(|m| {
            // All clamp math in the chosen monitor's logical space.
            let mscale = m.scale_factor();
            let cur_lx = pos.x as f64 / mscale;
            let cur_ly = pos.y as f64 / mscale;
            (m, cur_lx, cur_ly, win_lw, win_lh)
        })
    };

    let Some((m, cur_lx, cur_ly, lw, lh)) = chosen else {
        log::warn!("[reclamp] no monitor contains window centre; leaving position unchanged");
        return;
    };

    let (lx, ly) = clamp_to_monitor_logical(cur_lx, cur_ly, lw, lh, m);
    log::info!("[reclamp] cur=({:.1},{:.1}) size=({:.1}x{:.1}) -> ({:.1},{:.1})", cur_lx, cur_ly, lw, lh, lx, ly);
    let _ = window.set_position(LogicalPosition::new(lx, ly));
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
    #[cfg(not(target_os = "macos"))]
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
    // Priority 1: spawn with window top-centre at the cursor's logical position,
    // clamped to remain fully on the cursor's monitor.
    #[cfg(target_os = "macos")]
    let cursor_target = app
        .cursor_position()
        .ok()
        .and_then(|c| {
            let lx = c.x / primary_scale;
            let ly = c.y / primary_scale;
            let r = monitors.iter().find(|m| logical_point_in_rect(lx, ly, &Rect::from(*m)));
            log::info!("[position_window] primary_scale={} monitor_at_logical({:.1},{:.1}) → {:?}", primary_scale, lx, ly, r.and_then(|m| m.name()));
            r.map(|m| (m, lx, ly))
        });

    #[cfg(not(target_os = "macos"))]
    let cursor_target = app
        .cursor_position()
        .ok()
        .and_then(|c| monitor_at_phys(c.x, c.y).map(|m| (m, c.x, c.y)));

    if let Some((m, cursor_lx, cursor_ly)) = cursor_target {
        let (lx, ly) = clamp_to_monitor_logical(cursor_lx, cursor_ly, win_lw, win_lh, m);
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

    // ------------------------------------------------------------------ //
    // clamp_to_monitor_logical_rect
    // ------------------------------------------------------------------ //

    #[test]
    fn clamp_rect_inside_bounds_unchanged() {
        // Retina 1440x900 logical (physical 2880x1800 @ 2.0). A 400x500 window at
        // (200, 200) is fully inside; clamp must leave it alone.
        let r = Rect { x: 0, y: 0, w: 2880, h: 1800, scale: 2.0 };
        let (lx, ly) = clamp_to_monitor_logical_rect(200.0, 200.0, 400.0, 500.0, &r);
        assert_eq!((lx, ly), (200.0, 200.0));
    }

    #[test]
    fn clamp_rect_overflow_right_snaps_left() {
        // Bug case: 1440x900 logical monitor, 400-wide window spawned at lx=1040
        // (= 1440 - 400). After preview panel opens, window grows to 720 wide;
        // it would overflow by 320px. Expected: lx clamped to 1440 - 720 = 720.
        let r = Rect { x: 0, y: 0, w: 2880, h: 1800, scale: 2.0 };
        let (lx, ly) = clamp_to_monitor_logical_rect(1040.0, 100.0, 720.0, 500.0, &r);
        assert_eq!(lx, 720.0);
        assert_eq!(ly, 100.0);
    }

    #[test]
    fn clamp_rect_overflow_bottom_snaps_up() {
        // Window past bottom: monitor logical 1440x900, window 400x500 at ly=600
        // (would extend to 1100, overflowing 900). Expected: ly = 900 - 500 = 400.
        let r = Rect { x: 0, y: 0, w: 2880, h: 1800, scale: 2.0 };
        let (lx, ly) = clamp_to_monitor_logical_rect(100.0, 600.0, 400.0, 500.0, &r);
        assert_eq!(lx, 100.0);
        assert_eq!(ly, 400.0);
    }

    #[test]
    fn clamp_rect_window_larger_than_monitor() {
        // win_lw > mon_lw: max_lx falls back to mon_lx via .max(mon_lx).
        // Monitor logical 1440x900; window logical 1600x500. Caller passes lx=200
        // → expected: lx clamps to mon_lx (0.0).
        let r = Rect { x: 0, y: 0, w: 2880, h: 1800, scale: 2.0 };
        let (lx, _ly) = clamp_to_monitor_logical_rect(200.0, 100.0, 1600.0, 500.0, &r);
        assert_eq!(lx, 0.0);
    }

    #[test]
    fn clamp_rect_secondary_monitor() {
        // Secondary monitor at physical x=2880, scale 1.0, logical bounds [2880, 4800).
        // Window 720x500 fully inside at lx=3000 → unchanged.
        let r = Rect { x: 2880, y: 0, w: 1920, h: 1080, scale: 1.0 };
        let (lx, ly) = clamp_to_monitor_logical_rect(3000.0, 100.0, 720.0, 500.0, &r);
        assert_eq!((lx, ly), (3000.0, 100.0));

        // Overflow case on secondary: lx=4500, window 720 would extend to 5220
        // (past right edge 4800). Expected: clamp to 4800 - 720 = 4080.
        let (lx2, _) = clamp_to_monitor_logical_rect(4500.0, 100.0, 720.0, 500.0, &r);
        assert_eq!(lx2, 4080.0);

        // Below-left underflow: lx=2000 < mon_lx=2880 → clamps up to 2880.
        let (lx3, _) = clamp_to_monitor_logical_rect(2000.0, 100.0, 720.0, 500.0, &r);
        assert_eq!(lx3, 2880.0);
    }
}
