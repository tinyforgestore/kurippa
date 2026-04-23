use crate::license::{store::*, types::*};

pub(crate) const PRODUCT_ID_LIVE: &str = "979047";
pub(crate) const PRODUCT_ID_TEST: &str = "991094";
const LS_BASE_URL: &str = "https://api.lemonsqueezy.com";

pub async fn activate_license(app: &tauri::AppHandle, key: &str) -> Result<ActivationDetails, LicenseError> {
    activate_license_inner(app, key, LS_BASE_URL).await
}

async fn activate_license_inner(
    app: &tauri::AppHandle,
    key: &str,
    base_url: &str,
) -> Result<ActivationDetails, LicenseError> {
    let hostname = gethostname::gethostname().to_string_lossy().to_string();

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "license_key": key,
        "instance_name": hostname,
    });

    let url = format!("{base_url}/v1/licenses/activate");
    let response = client
        .post(&url)
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
        return Err(classify_activation_error(&error_msg));
    }

    log::info!("[license] activated=true");

    let (instance_id, details) = parse_activation_response(&json)?;

    let activated_at = chrono_now_rfc3339();

    let info = LicenseInfo {
        license_key: key.to_string(),
        instance_id: instance_id.clone(),
        activated_at,
    };
    save_license_file(app, &info);

    Ok(details)
}

pub async fn deactivate_license(app: &tauri::AppHandle) -> Result<(), LicenseError> {
    let info = load_license_file(app).ok_or(LicenseError::InvalidKey)?;
    deactivate_license_inner(&info.license_key, &info.instance_id, LS_BASE_URL, || {
        delete_license_file(app);
    })
    .await
}

async fn deactivate_license_inner(
    license_key: &str,
    instance_id: &str,
    base_url: &str,
    on_success: impl FnOnce(),
) -> Result<(), LicenseError> {
    let client = reqwest::Client::new();
    let url = format!("{base_url}/v1/licenses/deactivate");
    let resp = client
        .post(&url)
        .json(&serde_json::json!({
            "license_key": license_key,
            "instance_id": instance_id,
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
        on_success();
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
    revalidate_inner(&info.license_key, &info.instance_id, LS_BASE_URL, || {
        delete_license_file(app);
    })
    .await
}

async fn revalidate_inner(
    license_key: &str,
    instance_id: &str,
    base_url: &str,
    on_invalid: impl FnOnce(),
) -> Result<(), LicenseError> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "license_key": license_key,
        "instance_id": instance_id,
    });

    let url = format!("{base_url}/v1/licenses/validate");
    let response = client
        .post(&url)
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
        on_invalid();
        return Err(LicenseError::InvalidKey);
    }

    let product_id = json
        .get("meta")
        .and_then(|m| m.get("product_id"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0)
        .to_string();

    if product_id != PRODUCT_ID_LIVE && product_id != PRODUCT_ID_TEST {
        on_invalid();
        return Err(LicenseError::InvalidKey);
    }

    Ok(())
}

/// Maps an error message string from the LS API to the correct LicenseError variant.
fn classify_activation_error(error_msg: &str) -> LicenseError {
    let lower = error_msg.to_lowercase();
    if lower.contains("has reached the activation limit") {
        LicenseError::DeviceLimitReached
    } else if lower.contains("invalid") {
        LicenseError::InvalidKey
    } else if lower.contains("already activated") {
        LicenseError::AlreadyActivated
    } else {
        LicenseError::Unknown(error_msg.to_string())
    }
}

/// Parses a successful activation JSON response into (instance_id, ActivationDetails).
/// Returns Err if product_id doesn't match or instance_id is missing.
fn parse_activation_response(
    json: &serde_json::Value,
) -> Result<(String, ActivationDetails), LicenseError> {
    let product_id = json
        .get("meta")
        .and_then(|m| m.get("product_id"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0)
        .to_string();

    if product_id != PRODUCT_ID_LIVE && product_id != PRODUCT_ID_TEST {
        log::warn!("[license] product_id mismatch — rejecting");
        return Err(LicenseError::InvalidKey);
    }

    let instance_id = json
        .get("instance")
        .and_then(|i| i.get("id"))
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| {
            LicenseError::Unknown("Missing instance ID in activation response".to_string())
        })?
        .to_string();

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

    Ok((
        instance_id,
        ActivationDetails {
            plan_name,
            email_masked,
            device_count,
            device_limit,
            expires_label,
        },
    ))
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

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    // --- classify_activation_error ---

    #[test]
    fn classify_device_limit_reached() {
        let err = classify_activation_error("has reached the activation limit");
        assert!(matches!(err, LicenseError::DeviceLimitReached));
    }

    #[test]
    fn classify_invalid_key() {
        let err = classify_activation_error("This license key is invalid");
        assert!(matches!(err, LicenseError::InvalidKey));
    }

    #[test]
    fn classify_already_activated() {
        let err = classify_activation_error("License is already activated");
        assert!(matches!(err, LicenseError::AlreadyActivated));
    }

    #[test]
    fn classify_unknown() {
        let err = classify_activation_error("something else");
        match err {
            LicenseError::Unknown(msg) => assert_eq!(msg, "something else"),
            other => panic!("expected Unknown, got {other:?}"),
        }
    }

    // --- parse_activation_response ---

    fn make_valid_json(product_id: &str, instance_id: &str, variant: &str) -> serde_json::Value {
        serde_json::json!({
            "meta": {
                "product_id": product_id.parse::<u64>().unwrap_or(0),
                "variant_name": variant,
                "customer_email": "user@example.com"
            },
            "instance": {
                "id": instance_id
            },
            "license_key": {
                "activation_usage": 2_u64,
                "activation_limit": 5_u64
            }
        })
    }

    #[test]
    fn parse_valid_test_product_default_variant() {
        let json = make_valid_json(PRODUCT_ID_TEST, "inst-abc", "Default");
        let (id, details) = parse_activation_response(&json).unwrap();
        assert_eq!(id, "inst-abc");
        assert_eq!(details.plan_name, "Kurippa — Lifetime");
        assert_eq!(details.email_masked, "u•••@example.com");
        assert_eq!(details.device_count, 2);
        assert_eq!(details.device_limit, 5);
        assert_eq!(details.expires_label, "Never (lifetime license)");
    }

    #[test]
    fn parse_named_variant_uses_variant_name() {
        let json = make_valid_json(PRODUCT_ID_TEST, "inst-xyz", "Annual");
        let (_, details) = parse_activation_response(&json).unwrap();
        assert_eq!(details.plan_name, "Kurippa — Annual");
    }

    #[test]
    fn parse_wrong_product_id_returns_invalid_key() {
        let json = make_valid_json("000000", "inst-abc", "Default");
        let err = parse_activation_response(&json).unwrap_err();
        assert!(matches!(err, LicenseError::InvalidKey));
    }

    #[test]
    fn parse_missing_instance_id_returns_unknown() {
        let json = serde_json::json!({
            "meta": { "product_id": PRODUCT_ID_TEST.parse::<u64>().unwrap() },
            "license_key": {}
        });
        let err = parse_activation_response(&json).unwrap_err();
        assert!(matches!(err, LicenseError::Unknown(_)));
    }

    #[test]
    fn parse_empty_instance_id_returns_unknown() {
        let json = serde_json::json!({
            "meta": { "product_id": PRODUCT_ID_TEST.parse::<u64>().unwrap() },
            "instance": { "id": "" },
            "license_key": {}
        });
        let err = parse_activation_response(&json).unwrap_err();
        assert!(matches!(err, LicenseError::Unknown(_)));
    }

    #[test]
    fn parse_expires_at_present() {
        let mut json = make_valid_json(PRODUCT_ID_TEST, "inst-abc", "Default");
        json["license_key"]["expires_at"] = serde_json::Value::String("2025-12-31".to_string());
        let (_, details) = parse_activation_response(&json).unwrap();
        assert_eq!(details.expires_label, "2025-12-31");
    }

    #[test]
    fn parse_expires_at_absent_is_lifetime() {
        let json = make_valid_json(PRODUCT_ID_TEST, "inst-abc", "Default");
        let (_, details) = parse_activation_response(&json).unwrap();
        assert_eq!(details.expires_label, "Never (lifetime license)");
    }

    // --- days_to_ymd ---

    #[test]
    fn days_to_ymd_epoch() {
        assert_eq!(days_to_ymd(0), (1970, 1, 1));
    }

    #[test]
    fn days_to_ymd_one_year() {
        assert_eq!(days_to_ymd(365), (1971, 1, 1));
    }

    #[test]
    fn days_to_ymd_2000_03_01() {
        // 2000-03-01 is day 11017 from 1970-01-01
        assert_eq!(days_to_ymd(11017), (2000, 3, 1));
    }

    #[test]
    fn days_to_ymd_leap_day_2000_02_29() {
        // 2000-02-29 is day 11016 from 1970-01-01
        assert_eq!(days_to_ymd(11016), (2000, 2, 29));
    }

    // --- chrono_now_rfc3339 ---

    #[test]
    fn chrono_now_rfc3339_format() {
        let ts = chrono_now_rfc3339();
        let re = regex_lite(&ts);
        assert!(re, "timestamp '{ts}' did not match RFC3339 UTC pattern");
    }

    /// Returns true if the string matches ^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$
    fn regex_lite(s: &str) -> bool {
        let bytes = s.as_bytes();
        if bytes.len() != 20 {
            return false;
        }
        let digit = |b: u8| b.is_ascii_digit();
        digit(bytes[0])
            && digit(bytes[1])
            && digit(bytes[2])
            && digit(bytes[3])
            && bytes[4] == b'-'
            && digit(bytes[5])
            && digit(bytes[6])
            && bytes[7] == b'-'
            && digit(bytes[8])
            && digit(bytes[9])
            && bytes[10] == b'T'
            && digit(bytes[11])
            && digit(bytes[12])
            && bytes[13] == b':'
            && digit(bytes[14])
            && digit(bytes[15])
            && bytes[16] == b':'
            && digit(bytes[17])
            && digit(bytes[18])
            && bytes[19] == b'Z'
    }

    // -----------------------------------------------------------------------
    // HTTP mock tests — activate_license_inner
    // -----------------------------------------------------------------------

    fn valid_activation_body(product_id: u64) -> serde_json::Value {
        serde_json::json!({
            "activated": true,
            "meta": {
                "product_id": product_id,
                "variant_name": "Default",
                "customer_email": "user@example.com"
            },
            "instance": {
                "id": "test-instance-id-123"
            },
            "license_key": {
                "activation_usage": 1_u64,
                "activation_limit": 3_u64
            }
        })
    }

    #[tokio::test]
    async fn activate_license_success() {
        let mock_server = MockServer::start().await;

        Mock::given(method("POST"))
            .and(path("/v1/licenses/activate"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(valid_activation_body(PRODUCT_ID_TEST.parse::<u64>().expect("parse PRODUCT_ID_TEST"))),
            )
            .mount(&mock_server)
            .await;

        // activate_license_inner requires an AppHandle for save_license_file.
        // We test the HTTP + parsing logic via a thin wrapper that skips file I/O.
        let result = activate_license_http_only("XXXX-YYYY", &mock_server.uri()).await;
        assert!(result.is_ok(), "expected Ok, got {result:?}");
        let details = result.expect("activation details");
        assert_eq!(details.plan_name, "Kurippa — Lifetime");
        assert_eq!(details.device_count, 1);
        assert_eq!(details.device_limit, 3);
    }

    #[tokio::test]
    async fn activate_license_invalid_key() {
        let mock_server = MockServer::start().await;

        Mock::given(method("POST"))
            .and(path("/v1/licenses/activate"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({
                    "activated": false,
                    "error": "This license key is invalid"
                })),
            )
            .mount(&mock_server)
            .await;

        let result = activate_license_http_only("BAD-KEY", &mock_server.uri()).await;
        assert!(matches!(result, Err(LicenseError::InvalidKey)), "expected InvalidKey, got {result:?}");
    }

    #[tokio::test]
    async fn activate_license_network_error() {
        // Nothing listening on port 1 — connection refused → NetworkError
        let result = activate_license_http_only("ANY-KEY", "http://127.0.0.1:1").await;
        assert!(
            matches!(result, Err(LicenseError::NetworkError(_))),
            "expected NetworkError, got {result:?}"
        );
    }

    /// Thin test helper: performs the HTTP call and JSON parsing of activate
    /// without touching the file system (no AppHandle needed).
    async fn activate_license_http_only(
        key: &str,
        base_url: &str,
    ) -> Result<ActivationDetails, LicenseError> {
        let client = reqwest::Client::new();
        let body = serde_json::json!({
            "license_key": key,
            "instance_name": "test-host",
        });

        let url = format!("{base_url}/v1/licenses/activate");
        let response = client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| LicenseError::NetworkError(e.to_string()))?;

        let json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| LicenseError::NetworkError(e.to_string()))?;

        let activated = json.get("activated").and_then(|v| v.as_bool()).unwrap_or(false);
        if !activated {
            let error_msg = json
                .get("error")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            return Err(classify_activation_error(&error_msg));
        }

        let (_instance_id, details) = parse_activation_response(&json)?;
        Ok(details)
    }

    // -----------------------------------------------------------------------
    // HTTP mock tests — deactivate_license_inner
    // -----------------------------------------------------------------------

    #[tokio::test]
    async fn deactivate_license_success() {
        let mock_server = MockServer::start().await;

        Mock::given(method("POST"))
            .and(path("/v1/licenses/deactivate"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({
                    "deactivated": true
                })),
            )
            .mount(&mock_server)
            .await;

        let mut on_success_called = false;
        let result = deactivate_license_inner(
            "XXXX-YYYY",
            "inst-abc",
            &mock_server.uri(),
            || { on_success_called = true; },
        )
        .await;

        assert!(result.is_ok(), "expected Ok, got {result:?}");
        assert!(on_success_called, "on_success callback should have been called");
    }

    #[tokio::test]
    async fn deactivate_license_failure() {
        let mock_server = MockServer::start().await;

        Mock::given(method("POST"))
            .and(path("/v1/licenses/deactivate"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({
                    "deactivated": false,
                    "error": "Instance not found"
                })),
            )
            .mount(&mock_server)
            .await;

        let result = deactivate_license_inner(
            "XXXX-YYYY",
            "inst-abc",
            &mock_server.uri(),
            || {},
        )
        .await;

        assert!(
            matches!(result, Err(LicenseError::Unknown(_))),
            "expected Unknown error, got {result:?}"
        );
    }

    // -----------------------------------------------------------------------
    // HTTP mock tests — revalidate_inner
    // -----------------------------------------------------------------------

    #[tokio::test]
    async fn revalidate_success() {
        let mock_server = MockServer::start().await;

        Mock::given(method("POST"))
            .and(path("/v1/licenses/validate"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({
                    "valid": true,
                    "meta": {
                        "product_id": PRODUCT_ID_TEST.parse::<u64>().expect("parse PRODUCT_ID_TEST")
                    }
                })),
            )
            .mount(&mock_server)
            .await;

        let result = revalidate_inner("XXXX-YYYY", "inst-abc", &mock_server.uri(), || {}).await;
        assert!(result.is_ok(), "expected Ok, got {result:?}");
    }

    #[tokio::test]
    async fn revalidate_invalid_valid_false() {
        let mock_server = MockServer::start().await;

        Mock::given(method("POST"))
            .and(path("/v1/licenses/validate"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({
                    "valid": false,
                    "error": "License key not found"
                })),
            )
            .mount(&mock_server)
            .await;

        let mut on_invalid_called = false;
        let result =
            revalidate_inner("BAD-KEY", "inst-abc", &mock_server.uri(), || {
                on_invalid_called = true;
            })
            .await;

        assert!(
            matches!(result, Err(LicenseError::InvalidKey)),
            "expected InvalidKey, got {result:?}"
        );
        assert!(on_invalid_called, "on_invalid callback should have been called");
    }

    #[tokio::test]
    async fn revalidate_invalid_wrong_product_id() {
        let mock_server = MockServer::start().await;

        Mock::given(method("POST"))
            .and(path("/v1/licenses/validate"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({
                    "valid": true,
                    "meta": {
                        "product_id": 999999_u64
                    }
                })),
            )
            .mount(&mock_server)
            .await;

        let mut on_invalid_called = false;
        let result =
            revalidate_inner("XXXX-YYYY", "inst-abc", &mock_server.uri(), || {
                on_invalid_called = true;
            })
            .await;

        assert!(
            matches!(result, Err(LicenseError::InvalidKey)),
            "expected InvalidKey for wrong product_id, got {result:?}"
        );
        assert!(on_invalid_called, "on_invalid callback should have been called for wrong product_id");
    }

    #[tokio::test]
    async fn revalidate_network_error() {
        let result =
            revalidate_inner("XXXX-YYYY", "inst-abc", "http://127.0.0.1:1", || {}).await;
        assert!(
            matches!(result, Err(LicenseError::NetworkError(_))),
            "expected NetworkError, got {result:?}"
        );
    }
}
