use serde::{Deserialize, Serialize};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CustomSource {
    pub version_url: String,
    pub version_regex: String,
    pub download_url_template: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Emulator {
    pub id: String,
    pub name: String,
    pub description: String,
    pub github_owner: String,
    pub github_repo: String,
    pub github_repo_windows: Option<String>,
    pub github_repo_linux: Option<String>,
    pub asset_pattern: String,
    pub asset_pattern_windows: Option<String>,
    pub asset_pattern_linux: Option<String>,
    pub custom_source: Option<CustomSource>,
    pub portable_type: Option<String>,
    pub portable_target: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct InstallStatus {
    pub installed: bool,
    pub version: Option<String>,
    pub is_portable: bool,
}

#[derive(Serialize, Clone, Debug)]
pub struct ProgressPayload {
    pub status: String,
    pub progress: f64,
}

#[derive(Clone, Default)]
pub struct CancelFlag(pub Arc<AtomicBool>);

pub fn parse_custom_source_version(source: &CustomSource, body: &str) -> Result<String, String> {
    if let Ok(json_val) = serde_json::from_str::<serde_json::Value>(body) {
        let target = if let Some(arr) = json_val.as_array() {
            arr.first()
        } else if json_val.is_object() {
            Some(&json_val)
        } else {
            None
        };

        if let Some(j) = target {
            if let Some(shortrev) = j.get("shortrev").and_then(|v| v.as_str()) {
                return Ok(shortrev.to_string());
            }
            if let Some(ver) = j.get("version").and_then(|v| v.as_str()) {
                return Ok(ver.to_string());
            }
            if let Some(tag_name) = j.get("tag_name").and_then(|v| v.as_str()) {
                let name = j.get("name").and_then(|v| v.as_str());
                let published_at = j.get("published_at").and_then(|v| v.as_str());
                return Ok(resolve_release_version(tag_name, name, None, published_at, None));
            }
        }
    }

    if !source.version_regex.is_empty() {
        let re = regex::Regex::new(&source.version_regex).map_err(|e| e.to_string())?;
        if let Some(caps) = re.captures(body) {
            if let Some(m) = caps.get(1) {
                return Ok(m.as_str().to_string());
            }
        }
    }

    Err("Could not parse version from custom source".to_string())
}

pub fn extract_custom_source_artifact(body: &str, pattern: &str) -> Option<String> {
    let json_val: serde_json::Value = serde_json::from_str(body).ok()?;
    let target = if let Some(arr) = json_val.as_array() {
        arr.first()
    } else if json_val.is_object() {
        Some(&json_val)
    } else {
        None
    }?;

    let list = target.get("artifacts").or_else(|| target.get("assets"))?.as_array()?;
    let pat = pattern.to_lowercase();

    list.iter().find(|art| {
        let sys = art.get("system").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
        let name = art.get("name").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
        let u = art.get("url").or_else(|| art.get("browser_download_url")).and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
        sys.contains(&pat) || name.contains(&pat) || u.contains(&pat)
    }).and_then(|art| {
        art.get("browser_download_url")
            .or_else(|| art.get("url"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    })
}

pub fn resolve_release_version(
    tag: &str,
    name: Option<&str>,
    body: Option<&str>,
    published_at: Option<&str>,
    asset_name: Option<&str>,
) -> String {
    let clean_tag = if tag.starts_with("v.") {
        format!("v{}", &tag[2..])
    } else {
        tag.to_string()
    };

    if clean_tag.starts_with('v') && clean_tag.contains('.') {
        if let Some(pos) = clean_tag.find('.') {
            let commit_part = &clean_tag[pos + 1..];
            if commit_part.len() >= 7 && commit_part.chars().all(|c| c.is_ascii_hexdigit()) {
                return format!("nightly-{}", commit_part);
            }
        }
    }

    if clean_tag.starts_with("shadPS4QtLauncher-") {
        if let Some(n) = name {
            let trimmed = n.trim().trim_start_matches("shadPS4QtLauncher-");
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
        if clean_tag.len() > 28 {
            return clean_tag[18..28].to_string();
        }
    }

    if clean_tag.starts_with("build-") || (clean_tag.len() >= 32 && clean_tag.chars().all(|c| c.is_ascii_hexdigit())) {
        if let Some(n) = name {
            let trimmed = n.trim();
            if regex::Regex::new(r"^\d+\.\d+").map(|r| r.is_match(trimmed)).unwrap_or(false) {
                return trimmed.to_string();
            }
        }
        if let Some(an) = asset_name {
            if let Ok(re) = regex::Regex::new(r"(?:rpcs3-)?v?(\d+\.\d+\.\d+-\d+)") {
                if let Some(caps) = re.captures(an) {
                    if let Some(ver) = caps.get(1) {
                        return ver.as_str().to_string();
                    }
                }
            }
        }
    }

    if clean_tag == "latest" || clean_tag == "rolling" || clean_tag == "master" || clean_tag.is_empty() {
        if let Some(body_text) = body {
            if let Ok(re) = regex::Regex::new(r"(?m)(?:-\s*|commit\s*[:=]\s*)([a-f0-9]{7,10})\b") {
                if let Some(caps) = re.captures(body_text) {
                    if let Some(commit) = caps.get(1) {
                        return commit.as_str().to_string();
                    }
                }
            }
        }
        if let Some(date_str) = published_at {
            if date_str.len() >= 10 {
                return format!("preview-{}", &date_str[..10]);
            }
        }
    }

    clean_tag
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_standard_tag() {
        assert_eq!(resolve_release_version("v1.2.3", None, None, None, None), "v1.2.3");
    }

    #[test]
    fn test_resolve_eden_nightly_tag() {
        assert_eq!(
            resolve_release_version("v1788034417.3df41c1e7a", Some("Eden Nightly - Aug 29 2026"), None, None, None),
            "nightly-3df41c1e7a"
        );
    }

    #[test]
    fn test_resolve_shadps4_qtlauncher_tag() {
        assert_eq!(
            resolve_release_version(
                "shadPS4QtLauncher-2026-08-26-d2c682c01cbea32abe57a6dda2cd8404ba503f15",
                Some("shadPS4QtLauncher-2026-08-26-d2c682c"),
                None,
                None,
                None
            ),
            "2026-08-26-d2c682c"
        );
    }

    #[test]
    fn test_resolve_shadps4_tag() {
        assert_eq!(
            resolve_release_version("v.0.18.0", Some("shadps4 v0.18.0"), None, None, None),
            "v0.18.0"
        );
    }

    #[test]
    fn test_resolve_rpcs3_build_tag() {
        assert_eq!(
            resolve_release_version(
                "build-c85105a7fda77f6e76e10b82fc27cf3f7ccaa277",
                Some("0.0.42-19878"),
                None,
                Some("2026-08-29T21:05:57Z"),
                Some("rpcs3-v0.0.42-19878-c85105a7_win64_msvc.7z")
            ),
            "0.0.42-19878"
        );
    }

    #[test]
    fn test_resolve_rpcs3_asset_fallback() {
        assert_eq!(
            resolve_release_version(
                "build-c85105a7fda77f6e76e10b82fc27cf3f7ccaa277",
                None,
                None,
                None,
                Some("rpcs3-v0.0.42-19878-c85105a7_win64_msvc.7z")
            ),
            "0.0.42-19878"
        );
    }

    #[test]
    fn test_resolve_duckstation_rolling_commit() {
        let body = "## Commits\r\n- 6336c532a Cheats: Fix importing semi-broken files\r\n- c475fd699 Qt: Fix";
        assert_eq!(
            resolve_release_version("latest", None, Some(body), Some("2026-08-29T05:52:30Z"), None),
            "6336c532a"
        );
    }

    #[test]
    fn test_resolve_latest_fallback_date() {
        assert_eq!(
            resolve_release_version("latest", None, None, Some("2026-08-29T05:52:30Z"), None),
            "preview-2026-08-29"
        );
    }

    #[test]
    fn test_parse_custom_source_version_forgejo() {
        let source = CustomSource {
            version_url: "https://git.eden-emu.dev/api/v1/repos/eden-ci/nightly/releases/latest".to_string(),
            version_regex: "".to_string(),
            download_url_template: "".to_string(),
        };
        let body = r#"{"tag_name":"v1788034417.3df41c1e7a","name":"Eden Nightly - Aug 29 2026"}"#;
        assert_eq!(parse_custom_source_version(&source, body).unwrap(), "nightly-3df41c1e7a");
    }

    #[test]
    fn test_extract_custom_source_artifact() {
        let body = r#"{
            "tag_name": "v1.0.0",
            "assets": [
                {
                    "name": "eden-windows-msvc-pgo.zip",
                    "browser_download_url": "https://git.eden-emu.dev/attachments/abc-123"
                }
            ]
        }"#;
        assert_eq!(
            extract_custom_source_artifact(body, "windows-msvc-pgo").unwrap(),
            "https://git.eden-emu.dev/attachments/abc-123"
        );
    }
}
