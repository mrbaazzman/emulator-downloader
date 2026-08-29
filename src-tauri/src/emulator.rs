use crate::config::{get_emulator_path, get_github_token, load_installs_map};
use crate::models::{
    parse_custom_source_version, resolve_release_version, CustomSource, Emulator, InstallStatus,
};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

pub fn create_http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap_or_default()
}

pub fn is_github_url(url: &str) -> bool {
    url.starts_with("https://api.github.com/") || url.starts_with("https://github.com/")
}

pub async fn fetch_latest_github_release(
    client: &reqwest::Client,
    token: Option<&str>,
    owner: &str,
    repo: &str,
) -> Result<serde_json::Value, String> {
    let latest_url = format!("https://api.github.com/repos/{}/{}/releases/latest", owner, repo);
    let mut req = client.get(&latest_url).header("User-Agent", "emu-manager");
    if let Some(t) = token {
        req = req.header("Authorization", format!("Bearer {}", t));
    }
    let resp = req.send().await.map_err(|e| format!("Network error fetching release for {}/{}: {}", owner, repo, e))?;
    if resp.status().is_success() {
        return resp.json().await.map_err(|e| e.to_string());
    }

    let releases_url = format!("https://api.github.com/repos/{}/{}/releases?per_page=1", owner, repo);
    let mut req = client.get(&releases_url).header("User-Agent", "emu-manager");
    if let Some(t) = token {
        req = req.header("Authorization", format!("Bearer {}", t));
    }
    let resp = req.send().await.map_err(|e| format!("Network error fetching releases for {}/{}: {}", owner, repo, e))?;
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    if let Some(first) = json.as_array().and_then(|arr| arr.first()) {
        return Ok(first.clone());
    }

    Err(format!("No releases found for {}/{}", owner, repo))
}

#[tauri::command]
pub fn list_emulators(app: tauri::AppHandle) -> Vec<Emulator> {
    const DEFAULT_EMULATORS_JSON: &str = include_str!("../emulators.json");
    if let Ok(resource_dir) = app.path().resource_dir() {
        let path = resource_dir.join("emulators.json");
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(parsed) = serde_json::from_str::<Vec<Emulator>>(&content) {
                if !parsed.is_empty() {
                    return parsed;
                }
            }
        }
    }
    serde_json::from_str(DEFAULT_EMULATORS_JSON).unwrap_or_default()
}

#[tauri::command]
pub async fn get_latest_version(
    app: tauri::AppHandle,
    owner: String,
    repo: String,
    custom_source: Option<CustomSource>,
) -> Result<String, String> {
    let client = create_http_client();
    let token = get_github_token(&app);

    if let Some(source) = custom_source {
        let mut req = client.get(&source.version_url).header("User-Agent", "emu-manager");
        if let Some(t) = &token {
            if is_github_url(&source.version_url) {
                req = req.header("Authorization", format!("Bearer {}", t));
            }
        }
        let body = req.send().await.map_err(|e| format!("Unable to reach version server ({}): {}", source.version_url, e))?
            .text().await.map_err(|e| e.to_string())?;

        return parse_custom_source_version(&source, &body);
    }

    let json = fetch_latest_github_release(&client, token.as_deref(), &owner, &repo).await?;
    let raw_tag = json["tag_name"].as_str().unwrap_or("unknown");
    let name = json["name"].as_str();
    let body = json["body"].as_str();
    let published_at = json["published_at"].as_str();
    let first_asset = json["assets"].as_array().and_then(|a| a.first()).and_then(|a| a["name"].as_str());
    Ok(resolve_release_version(raw_tag, name, body, published_at, first_asset))
}

#[tauri::command]
pub fn check_install_status(app: tauri::AppHandle, emulator_id: String) -> InstallStatus {
    let resolve_path = get_emulator_path(app, emulator_id);
    let dest_dir = PathBuf::from(&resolve_path);
    let version_file = dest_dir.join("version.txt");
    if version_file.exists() {
        let version = fs::read_to_string(version_file).ok().map(|v| v.trim().to_string());
        let is_portable = dest_dir.join(".portable").exists()
            || dest_dir.join("portable.txt").exists()
            || dest_dir.join("portable.ini").exists()
            || dest_dir.join("installed.txt").exists();
        InstallStatus {
            installed: true,
            version,
            is_portable,
        }
    } else {
        InstallStatus {
            installed: false,
            version: None,
            is_portable: false,
        }
    }
}

pub fn find_executable(dir: &PathBuf) -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    let is_exec = |p: &PathBuf| -> bool {
        p.is_file() && p.extension().and_then(|e| e.to_str()) == Some("exe")
    };

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    let is_exec = |p: &PathBuf| -> bool {
        use std::os::unix::fs::PermissionsExt;
        if !p.is_file() { return false; }
        let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("");
        let excluded = matches!(ext, "so" | "py" | "sh" | "json" | "txt" | "png" | "svg" | "md" | "desktop");
        if excluded { return false; }
        fs::metadata(p).map(|m| m.permissions().mode() & 0o111 != 0).unwrap_or(false)
    };

    // search top level first
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if is_exec(&path) { return Ok(path); }
        }
    }

    // search one level deep
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                if let Ok(sub) = fs::read_dir(&path) {
                    for sub_entry in sub.flatten() {
                        let sub_path = sub_entry.path();
                        if is_exec(&sub_path) { return Ok(sub_path); }
                    }
                }
            }
        }
    }

    Err("Could not locate the main executable inside the folder.".to_string())
}

#[tauri::command]
pub async fn launch_emulator(app: tauri::AppHandle, emulator_id: String) -> Result<(), String> {
    let resolve_path = get_emulator_path(app, emulator_id);
    let base_dir = PathBuf::from(&resolve_path);

    if !base_dir.exists() {
        return Err("Emulator directory not found. Is it installed?".to_string());
    }

    let exe = find_executable(&base_dir)?;

    std::process::Command::new(&exe)
        .current_dir(&base_dir)
        .spawn()
        .map_err(|e| format!("Failed to launch: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn remove_emulator(app: tauri::AppHandle, emulator_id: String) -> Result<(), String> {
    let resolve_path = get_emulator_path(app.clone(), emulator_id.clone());
    let base_dir = PathBuf::from(&resolve_path);

    if base_dir.exists() {
        fs::remove_dir_all(&base_dir).map_err(|e| format!("Failed to delete folder: {}", e))?;
    }

    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let mut map = load_installs_map(&app);
    if let Some(obj) = map.as_object_mut() {
        obj.remove(&emulator_id);
    }
    let _ = fs::write(
        config_dir.join("installs.json"),
        serde_json::to_string_pretty(&map).unwrap_or_default(),
    );

    Ok(())
}

#[tauri::command]
pub fn open_folder(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        fs::create_dir_all(&p).map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer").arg(&path).spawn().map_err(|e| e.to_string())?;
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open").arg(&path).spawn().map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    std::process::Command::new("open").arg(&path).spawn().map_err(|e| e.to_string())?;
    Ok(())
}
