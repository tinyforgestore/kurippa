use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, Monitor, PhysicalPosition, PhysicalSize, WebviewWindow};

/// Last mouse-button-press position in rdev logical coordinates (points, not physical pixels).
/// Scaled by the monitor's scale_factor before use in `position_window`.
pub struct LastClickPos(pub Arc<Mutex<Option<(f64, f64)>>>);

/// Reads a saved window position from `<app_data_dir>/window_pos.json`.
/// File format: `[x,y]` (two comma-separated i32s inside square brackets).
pub fn load_window_pos(app: &AppHandle) -> Option<(i32, i32)> {
    let path = app.path().app_data_dir().ok()?.join("window_pos.json");
    let s = std::fs::read_to_string(path).ok()?;
    let s = s.trim().strip_prefix('[')?.strip_suffix(']')?;
    let mut parts = s.splitn(2, ',');
    let x = parts.next()?.trim().parse::<i32>().ok()?;
    let y = parts.next()?.trim().parse::<i32>().ok()?;
    Some((x, y))
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
    monitors.iter().any(|m| {
        let p = m.position();
        let s = m.size();
        x >= p.x
            && y >= p.y
            && x.saturating_add(win_w as i32) <= p.x + s.width as i32
            && y.saturating_add(win_h as i32) <= p.y + s.height as i32
    })
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
fn clamp_to_monitor(x: i32, y: i32, win_w: u32, win_h: u32, m: &Monitor) -> PhysicalPosition<i32> {
    let p = m.position();
    let s = m.size();
    // Guard: when window is wider/taller than monitor, clamp upper bound to origin so min ≤ max.
    let max_x = (p.x + s.width  as i32 - win_w as i32).max(p.x);
    let max_y = (p.y + s.height as i32 - win_h as i32).max(p.y);
    PhysicalPosition::new(x.clamp(p.x, max_x), y.clamp(p.y, max_y))
}

const DEFAULT_SPAWN_Y_RATIO: f64 = 0.30;

/// Chooses and applies the spawn position for the popup window.
///
/// Priority:
///   1. Last recorded mouse-button-press — window is centred on that point, clamped to its monitor.
///   2. Saved position from disk — used as-is if it fits, or clamped to its monitor.
///   3. Cursor's monitor — window centred horizontally at DEFAULT_SPAWN_Y_RATIO from top.
pub fn position_window(app: &AppHandle, window: &WebviewWindow) {
    let win_size = window.outer_size().unwrap_or(PhysicalSize::new(400, 500));
    let win_w = win_size.width;
    let win_h = win_size.height;

    let monitors: Vec<Monitor> = app.available_monitors().unwrap_or_default();

    let last_click: Option<(f64, f64)> = app
        .try_state::<LastClickPos>()
        .and_then(|s| s.0.lock().ok().map(|g| *g))
        .flatten();

    // Helper: find the monitor whose LOGICAL bounds contain (fx, fy).
    // rdev gives logical (point) coordinates; Tauri stores physical pixels,
    // so we divide by scale_factor to get logical bounds before comparing.
    let rdev_monitor_at = |fx: f64, fy: f64| -> Option<&Monitor> {
        monitors.iter().find(|m| {
            let p = m.position();
            let s = m.size();
            let scale = m.scale_factor();
            let log_x = p.x as f64 / scale;
            let log_y = p.y as f64 / scale;
            let log_w = s.width as f64 / scale;
            let log_h = s.height as f64 / scale;
            fx >= log_x && fx < log_x + log_w && fy >= log_y && fy < log_y + log_h
        })
    };

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

    // Helper: convert rdev logical (fx, fy) to physical and centre the window there.
    let center_on_rdev = |fx: f64, fy: f64, m: &Monitor| -> PhysicalPosition<i32> {
        let scale = m.scale_factor();
        let x = (fx * scale) as i32 - win_w as i32 / 2;
        let y = (fy * scale) as i32 - win_h as i32 / 2;
        clamp_to_monitor(x, y, win_w, win_h, m)
    };

    // Priority 1: centre on last click position (rdev logical coords).
    if let Some((fx, fy)) = last_click {
        if let Some(m) = rdev_monitor_at(fx, fy) {
            let _ = window.set_position(center_on_rdev(fx, fy, m));
            return;
        }
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

    // Priority 3: center on cursor's monitor at DEFAULT_SPAWN_Y_RATIO.
    let target = app
        .cursor_position()
        .ok()
        .and_then(|c| monitor_at_phys(c.x, c.y))
        .or_else(|| monitors.first());

    let spawn_pos = match target {
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
    // clamp_to_monitor and pos_is_safe cannot be unit-tested here because
    // tauri::Monitor has no public constructor. Integration tests via AppHandle
    // are the appropriate coverage mechanism.
}
