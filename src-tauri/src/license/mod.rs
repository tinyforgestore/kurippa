mod api;
mod store;
mod types;

pub use api::{activate_license, deactivate_license, revalidate};
pub use types::{ActivationDetails, LicenseError, LicenseInfo};

pub const REVALIDATION_INTERVAL_SECS: u64 = 86400;

pub fn is_activated(app: &tauri::AppHandle) -> bool {
    store::load_license_file(app).is_some()
}

pub fn get_license_info(app: &tauri::AppHandle) -> Option<LicenseInfo> {
    store::load_license_file(app)
}
