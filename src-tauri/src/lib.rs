mod clipboard;
mod commands;
mod db;
mod license;
mod paste;
mod settings;
mod window;

use commands::UpdaterState;
use db::DbState;
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::{
    tray::{MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, ShortcutState};
use tauri_plugin_store::StoreExt;
use tauri_plugin_updater::UpdaterExt;

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .targets([tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout)])
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(UpdaterState(Mutex::new(None)))
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // --- DB setup ---
            let db_path = app
                .path()
                .app_data_dir()
                .expect("could not resolve app data dir")
                .join("kurippa.db");

            std::fs::create_dir_all(db_path.parent().unwrap())
                .expect("could not create app data dir");

            let conn = db::open(&db_path).expect("could not open database");
            let db_state: DbState = Arc::new(Mutex::new(conn));
            app.manage(db_state.clone());

            // --- Last-click position tracker (rdev) ---
            // Track the last global mouse-click position for monitor selection.
            // Use AtomicU64 (via f64::to_bits) so the CGEventTap callback never
            // blocks on a Mutex — a blocking callback causes macOS to disable the tap.
            // u64::MAX is the sentinel meaning "no position recorded yet".
            let last_click_x = Arc::new(AtomicU64::new(u64::MAX));
            let last_click_y = Arc::new(AtomicU64::new(u64::MAX));
            app.manage(window::LastClickPos(last_click_x.clone(), last_click_y.clone()));
            std::thread::spawn(move || {
                log::info!("[rdev] listener thread started");
                // rdev::Event has no position field; position lives inside
                // EventType::MouseMove { x, y }.  We keep a running cursor
                // position and snapshot it whenever a button is pressed.
                // Restart automatically if the CGEventTap is invalidated.
                // Exponential backoff: start at 1s, double each failure, cap at 30s.
                // Reset to 1s after a successful run that lasted more than 5 seconds.
                let mut backoff = std::time::Duration::from_secs(1);
                loop {
                    let click_x = last_click_x.clone();
                    let click_y = last_click_y.clone();
                    let mut cursor: (f64, f64) = (0.0, 0.0);
                    let start = std::time::Instant::now();
                    let result = rdev::listen(move |event| {
                        match event.event_type {
                            rdev::EventType::MouseMove { x, y } => {
                                cursor = (x, y);
                            }
                            rdev::EventType::ButtonPress(btn) => {
                                log::debug!("[rdev] ButtonPress({:?}) at cursor=({:.1},{:.1})", btn, cursor.0, cursor.1);
                                click_x.store(cursor.0.to_bits(), Ordering::Relaxed);
                                click_y.store(cursor.1.to_bits(), Ordering::Relaxed);
                            }
                            _ => {}
                        }
                    });
                    let elapsed = start.elapsed();
                    if elapsed > std::time::Duration::from_secs(5) {
                        // Tap survived long enough — considered a normal exit; reset backoff.
                        backoff = std::time::Duration::from_secs(1);
                    }
                    log::warn!("[rdev] listener exited: {:?}, restarting in {:?}", result, backoff);
                    std::thread::sleep(backoff);
                    backoff = (backoff * 2).min(std::time::Duration::from_secs(30));
                }
            });

            // --- License / activation ---
            let is_act = license::is_activated(app.handle());
            let store = app.store("app-store.json").ok();
            let is_trial = store
                .as_ref()
                .and_then(|s| s.get("trial"))
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            if !is_act && !is_trial {
                if let Some(win) = app.get_webview_window("activation") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }

            // --- Clipboard listener ---
            let paste_skip = clipboard::make_paste_skip();
            app.manage(paste_skip.clone());
            clipboard::spawn(app.handle().clone(), db_state, paste_skip);

            // --- Tray icon ---
            let tray_icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray-icon.png"))
                .expect("failed to load tray icon");

            let _tray = TrayIconBuilder::new()
                .icon(tray_icon)
                .icon_as_template(cfg!(target_os = "macos"))
                .tooltip("Kurippa")
                .on_tray_icon_event(|tray: &TrayIcon, event| {
                    if let TrayIconEvent::Click { button_state: MouseButtonState::Up, .. } = event {
                        window::toggle_window(tray.app_handle());
                    }
                })
                .build(app)?;

            // --- Settings window: hide on close instead of destroying ---
            if let Some(settings_win) = app.get_webview_window("settings") {
                let win = settings_win.clone();
                settings_win.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win.hide();
                    }
                });
            }

            // --- Activation window: hide on close, recording trial acceptance ---
            if let Some(activation_win) = app.get_webview_window("activation") {
                let act_handle = app.handle().clone();
                activation_win.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        // treat close as "continue with free trial" so it won't auto-show again
                        if let Ok(store) = act_handle.store("app-store.json") {
                            store.set("trial", serde_json::Value::Bool(true));
                            let _ = store.save();
                        }
                        if let Some(win) = act_handle.get_webview_window("activation") {
                            let _ = win.hide();
                        }
                    }
                });
            }

            // Save position whenever the user drags the main window, so any hide
            // path (hotkey, focus-loss dismiss) always finds an up-to-date value.
            if let Some(main_win) = app.get_webview_window("main") {
                let move_handle = app.handle().clone();
                main_win.on_window_event(move |event| {
                    if let tauri::WindowEvent::Moved(pos) = event {
                        window::save_window_pos(&move_handle, pos.x, pos.y);
                    }
                });
            }

            // --- Global shortcut ---
            let handle = app.handle().clone();
            app.global_shortcut().on_shortcut(
                tauri_plugin_global_shortcut::Shortcut::new(
                    Some(Modifiers::META | Modifiers::SHIFT),
                    Code::KeyC,
                ),
                move |_app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        window::toggle_window(&handle);
                    }
                },
            )?;

            // --- Update check ---
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match app_handle.updater() {
                    Ok(updater) => {
                        match updater.check().await {
                            Ok(Some(update)) => {
                                let version = update.version.clone();
                                let state = app_handle.state::<UpdaterState>();
                                *state.0.lock().unwrap() = Some(update);
                                let _ = app_handle.emit("update-available", version);
                            }
                            Ok(None) => {}
                            Err(e) => log::warn!("[updater] check failed: {e}"),
                        }
                    }
                    Err(e) => log::warn!("[updater] init failed: {e}"),
                }
            });

            // --- Background license revalidation (daily) ---
            let reval_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(license::REVALIDATION_INTERVAL_SECS)).await;
                    if !license::is_activated(&reval_handle) {
                        continue;
                    }
                    match license::revalidate(&reval_handle).await {
                        Ok(()) => {}
                        Err(license::LicenseError::NetworkError(_)) => {
                            // transient — do not revoke
                        }
                        Err(_) => {
                            if let Ok(store) = reval_handle.store("app-store.json") {
                                store.set("license_revoked", serde_json::Value::Bool(true));
                                let _ = store.save();
                            }
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_history,
            commands::paste_item,
            commands::paste_image_item,
            commands::pin_item,
            commands::unpin_item,
            commands::delete_item,
            commands::get_image_path,
            commands::open_settings_window,
            commands::clear_history,
            commands::quit_app,
            commands::get_settings,
            commands::save_settings,
            commands::set_launch_at_login,
            commands::pick_app_bundle,
            commands::merge_and_paste_items,
            commands::get_folders,
            commands::create_folder,
            commands::rename_folder,
            commands::delete_folder,
            commands::move_item_to_folder,
            commands::remove_item_from_folder,
            commands::install_update,
            commands::activate_license_cmd,
            commands::deactivate_license_cmd,
            commands::is_activated_cmd,
            commands::get_license_info_cmd,
            commands::set_free_trial_cmd,
            commands::show_activation_window,
            commands::finish_activation_cmd,
            commands::check_permissions,
            commands::request_accessibility_permission,
            commands::request_input_monitoring_permission,
            commands::open_privacy_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
