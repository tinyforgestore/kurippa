#[derive(serde::Serialize)]
pub struct PermissionsStatus {
    pub accessibility: bool,
    pub input_monitoring: bool,
}

#[cfg(target_os = "macos")]
mod macos {
    use super::PermissionsStatus;

    #[link(name = "ApplicationServices", kind = "framework")]
    extern "C" {
        // Boolean = unsigned char
        fn AXIsProcessTrusted() -> u8;
    }

    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        // CGBool = int32_t
        fn CGPreflightListenEventAccess() -> i32;
        fn CGRequestListenEventAccess() -> i32;
    }

    #[tauri::command]
    pub fn check_permissions() -> PermissionsStatus {
        let accessibility = (unsafe { AXIsProcessTrusted() }) != 0;
        let input_monitoring = (unsafe { CGPreflightListenEventAccess() }) != 0;
        PermissionsStatus { accessibility, input_monitoring }
    }

    #[tauri::command]
    pub fn request_accessibility_permission() {
        let _ = std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn();
    }

    #[tauri::command]
    pub fn request_input_monitoring_permission() -> bool {
        (unsafe { CGRequestListenEventAccess() }) != 0
    }

    #[tauri::command]
    pub fn open_privacy_settings() {
        let _ = std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security")
            .spawn();
    }
}

#[cfg(not(target_os = "macos"))]
mod stubs {
    use super::PermissionsStatus;

    #[tauri::command]
    pub fn check_permissions() -> PermissionsStatus {
        PermissionsStatus { accessibility: true, input_monitoring: true }
    }

    #[tauri::command]
    pub fn request_accessibility_permission() {}

    #[tauri::command]
    pub fn request_input_monitoring_permission() -> bool {
        true
    }

    #[tauri::command]
    pub fn open_privacy_settings() {}
}

#[cfg(target_os = "macos")]
pub use macos::*;

#[cfg(not(target_os = "macos"))]
pub use stubs::*;
