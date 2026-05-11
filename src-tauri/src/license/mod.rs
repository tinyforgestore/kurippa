mod api;
mod store;
mod types;

pub use api::{activate_license, deactivate_license, revalidate};
pub use types::{ActivationDetails, LicenseError, LicenseInfo};

pub const REVALIDATION_INTERVAL_SECS: u64 = 86400;

/// Error string returned by paid-only commands when the user is on trial.
/// Must stay in sync with the literal checked in src/hooks/usePasteActions.ts.
pub const TRIAL_ERROR: &str = "trial";

pub fn is_activated(app: &tauri::AppHandle) -> bool {
    store::load_license_file(app).is_some()
}

pub fn get_license_info(app: &tauri::AppHandle) -> Option<LicenseInfo> {
    store::load_license_file(app)
}
