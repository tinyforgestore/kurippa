use crate::license::{store::*, types::*};

pub(crate) const PRODUCT_ID_LIVE: &str = "979047";
pub(crate) const PRODUCT_ID_TEST: &str = "991094";
pub(crate) const ACTIVATE_URL: &str = "https://api.lemonsqueezy.com/v1/licenses/activate";
pub(crate) const VALIDATE_URL: &str = "https://api.lemonsqueezy.com/v1/licenses/validate";
pub(crate) const DEACTIVATE_URL: &str = "https://api.lemonsqueezy.com/v1/licenses/deactivate";

pub async fn activate_license(app: &tauri::AppHandle, key: &str) -> Result<ActivationDetails, LicenseError> {
    let hostname = gethostname::gethostname().to_string_lossy().to_string();

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "license_key": key,
        "instance_name": hostname,
    });

    let response = client
        .post(ACTIVATE_URL)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| LicenseError::NetworkError(e.to_string()))?;

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| LicenseError::NetworkError(e.to_string()))?;

    log::info!("[license] activate response: {json}");

    let activated = json.get("activated").and_then(|v| v.as_bool()).unwrap_or(false);

    if !activated {
        let error_msg = json
            .get("error")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        log::warn!("[license] activation rejected by LS: {error_msg:?}");
        let lower = error_msg.to_lowercase();
        return if lower.contains("has reached the activation limit") {
            Err(LicenseError::DeviceLimitReached)
        } else if lower.contains("invalid") {
            Err(LicenseError::InvalidKey)
        } else if lower.contains("already activated") {
            Err(LicenseError::AlreadyActivated)
        } else {
            Err(LicenseError::Unknown(error_msg))
        };
    }

    let product_id = json
        .get("meta")
        .and_then(|m| m.get("product_id"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0)
        .to_string();

    log::info!("[license] activated=true product_id={product_id:?}");

    if product_id != PRODUCT_ID_LIVE && product_id != PRODUCT_ID_TEST {
        log::warn!("[license] product_id mismatch — rejecting");
        return Err(LicenseError::InvalidKey);
    }

    let instance_id = json
        .get("instance")
        .and_then(|i| i.get("id"))
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| LicenseError::Unknown("Missing instance ID in activation response".to_string()))?
        .to_string();

    let activated_at = chrono_now_rfc3339();

    let info = LicenseInfo {
        license_key: key.to_string(),
        instance_id: instance_id.clone(),
        activated_at,
    };
    save_license_file(app, &info);

    let meta = json.get("meta");
    let lk = json.get("license_key");

    let variant_name = meta
        .and_then(|m| m.get("variant_name"))
        .and_then(|v| v.as_str())
        .unwrap_or("Default");
    let plan_suffix = if variant_name == "Default" { "Lifetime" } else { variant_name };
    let plan_name = format!("Kurippa — {plan_suffix}");

    let email_raw = meta
        .and_then(|m| m.get("customer_email"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let email_masked = mask_email(email_raw);

    let device_count = lk
        .and_then(|l| l.get("activation_usage"))
        .and_then(|v| v.as_u64())
        .unwrap_or(1);
    let device_limit = lk
        .and_then(|l| l.get("activation_limit"))
        .and_then(|v| v.as_u64())
        .unwrap_or(3);

    let expires_label = match lk.and_then(|l| l.get("expires_at")).and_then(|v| v.as_str()) {
        Some(d) if !d.is_empty() => d.to_string(),
        _ => "Never (lifetime license)".to_string(),
    };

    Ok(ActivationDetails {
        plan_name,
        email_masked,
        device_count,
        device_limit,
        expires_label,
    })
}

pub async fn deactivate_license(app: &tauri::AppHandle) -> Result<(), LicenseError> {
    let info = load_license_file(app).ok_or(LicenseError::InvalidKey)?;
    let client = reqwest::Client::new();
    let resp = client
        .post(DEACTIVATE_URL)
        .json(&serde_json::json!({
            "license_key": info.license_key,
            "instance_id": info.instance_id,
        }))
        .send()
        .await
        .map_err(|e| LicenseError::NetworkError(e.to_string()))?;

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| LicenseError::NetworkError(e.to_string()))?;

    let deactivated = json.get("deactivated").and_then(|v| v.as_bool()).unwrap_or(false);
    if deactivated {
        delete_license_file(app);
        Ok(())
    } else {
        let msg = json
            .get("error")
            .and_then(|v| v.as_str())
            .unwrap_or("Deactivation failed")
            .to_string();
        Err(LicenseError::Unknown(msg))
    }
}

pub async fn revalidate(app: &tauri::AppHandle) -> Result<(), LicenseError> {
    let info = match load_license_file(app) {
        Some(i) => i,
        None => return Err(LicenseError::InvalidKey),
    };

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "license_key": info.license_key,
        "instance_id": info.instance_id,
    });

    let response = client
        .post(VALIDATE_URL)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| LicenseError::NetworkError(e.to_string()))?;

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| LicenseError::NetworkError(e.to_string()))?;

    log::debug!("[license] revalidate response: {json}");

    let valid = json.get("valid").and_then(|v| v.as_bool()).unwrap_or(false);

    if !valid {
        delete_license_file(app);
        return Err(LicenseError::InvalidKey);
    }

    let product_id = json
        .get("meta")
        .and_then(|m| m.get("product_id"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0)
        .to_string();

    if product_id != PRODUCT_ID_LIVE && product_id != PRODUCT_ID_TEST {
        delete_license_file(app);
        return Err(LicenseError::InvalidKey);
    }

    Ok(())
}

fn chrono_now_rfc3339() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // Format as a simple RFC3339 UTC timestamp: 2024-01-01T00:00:00Z
    let days_since_epoch = secs / 86400;
    let time_of_day = secs % 86400;
    let h = time_of_day / 3600;
    let m = (time_of_day % 3600) / 60;
    let s = time_of_day % 60;

    // Gregorian calendar calculation from days since 1970-01-01
    let (year, month, day) = days_to_ymd(days_since_epoch);

    format!("{year:04}-{month:02}-{day:02}T{h:02}:{m:02}:{s:02}Z")
}

fn days_to_ymd(days: u64) -> (u64, u64, u64) {
    // Algorithm: civil date from days since 1970-01-01 (Gregorian)
    let z = days + 719468;
    let era = z / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}
