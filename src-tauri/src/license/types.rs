use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseInfo {
    pub license_key: String,
    pub instance_id: String,
    pub activated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivationDetails {
    pub plan_name: String,
    pub email_masked: String,
    pub device_count: u64,
    pub device_limit: u64,
    pub expires_label: String,
}

#[derive(Debug)]
pub enum LicenseError {
    InvalidKey,
    DeviceLimitReached,
    NetworkError(String),
    AlreadyActivated,
    Unknown(String),
}

impl fmt::Display for LicenseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LicenseError::InvalidKey => write!(f, "InvalidKey"),
            LicenseError::DeviceLimitReached => write!(f, "DeviceLimitReached"),
            LicenseError::NetworkError(msg) => write!(f, "NetworkError: {msg}"),
            LicenseError::AlreadyActivated => write!(f, "AlreadyActivated"),
            LicenseError::Unknown(msg) => write!(f, "Unknown: {msg}"),
        }
    }
}

pub(crate) fn mask_email(email: &str) -> String {
    match email.split_once('@') {
        Some((local, domain)) => {
            let first = local.chars().next().unwrap_or('?');
            format!("{first}•••@{domain}")
        }
        None => "•••".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- mask_email ---

    #[test]
    fn mask_email_normal() {
        assert_eq!(mask_email("user@example.com"), "u•••@example.com");
    }

    #[test]
    fn mask_email_single_char_local() {
        assert_eq!(mask_email("a@b.com"), "a•••@b.com");
    }

    #[test]
    fn mask_email_no_at_sign() {
        assert_eq!(mask_email("nodomain"), "•••");
    }

    #[test]
    fn mask_email_empty_string() {
        assert_eq!(mask_email(""), "•••");
    }

    // --- LicenseError Display ---

    #[test]
    fn display_invalid_key() {
        assert_eq!(LicenseError::InvalidKey.to_string(), "InvalidKey");
    }

    #[test]
    fn display_device_limit_reached() {
        assert_eq!(LicenseError::DeviceLimitReached.to_string(), "DeviceLimitReached");
    }

    #[test]
    fn display_network_error() {
        assert_eq!(
            LicenseError::NetworkError("timeout".to_string()).to_string(),
            "NetworkError: timeout"
        );
    }

    #[test]
    fn display_already_activated() {
        assert_eq!(LicenseError::AlreadyActivated.to_string(), "AlreadyActivated");
    }

    #[test]
    fn display_unknown() {
        assert_eq!(
            LicenseError::Unknown("bad".to_string()).to_string(),
            "Unknown: bad"
        );
    }
}
