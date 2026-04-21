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
