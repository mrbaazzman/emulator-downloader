use crate::config::get_github_token;
use crate::emulator::{create_http_client, fetch_github_release, fetch_latest_github_release, is_github_url};
use crate::models::{
    extract_custom_source_artifact, parse_custom_source_version, resolve_release_version,
    CancelFlag, CustomSource, ProgressPayload,
};
use futures_util::StreamExt;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::Ordering;
use tauri::{Emitter, State};

fn apply_portable_mode(
    dest_dir: &PathBuf,
    portable_type: Option<&str>,
    portable_target: Option<&str>,
) {
    match (portable_type, portable_target) {
        (Some("file"), Some(filename)) if !filename.is_empty() => {
            let target_path = dest_dir.join(filename);
            if !target_path.exists() {
                let _ = fs::File::create(&target_path);
            }
        }
        (Some("folder"), Some(folder_name)) if !folder_name.is_empty() => {
            let target_path = dest_dir.join(folder_name);
            let _ = fs::create_dir_all(&target_path);
        }
        _ => {}
    }
}

fn flatten_single_directory(dest_dir: &PathBuf) -> Result<(), String> {
    loop {
        let entries: Vec<PathBuf> = fs::read_dir(dest_dir)
            .map_err(|e| e.to_string())?
            .filter_map(|e| e.ok().map(|e| e.path()))
            .filter(|p| {
                p.file_name()
                    .and_then(|n| n.to_str())
                    .map(|name| name != "version.txt")
                    .unwrap_or(true)
            })
            .collect();

        if entries.len() == 1 && entries[0].is_dir() {
            let single_sub_dir = entries[0].clone();
            let sub_entries: Vec<PathBuf> = fs::read_dir(&single_sub_dir)
                .map_err(|e| e.to_string())?
                .filter_map(|e| e.ok().map(|e| e.path()))
                .collect();

            if sub_entries.is_empty() {
                break;
            }

            for item in sub_entries {
                if let Some(file_name) = item.file_name() {
                    let target_path = dest_dir.join(file_name);
                    fs::rename(&item, &target_path).map_err(|e| e.to_string())?;
                }
            }

            let _ = fs::remove_dir(&single_sub_dir);
        } else {
            break;
        }
    }
    Ok(())
}

async fn setup_avalonia_86box(
    client: &reqwest::Client,
    token: Option<&str>,
    dest_dir: &PathBuf,
    emit_progress: &impl Fn(&str, f64),
) -> Result<(), String> {
    let box_dir = dest_dir.join("86box");
    let configs_dir = dest_dir.join("configs");
    let _ = fs::create_dir_all(&box_dir);
    let _ = fs::create_dir_all(&configs_dir);

    emit_progress("Fetching 86Box binary for Avalonia86...", 90.0);

    let json = fetch_latest_github_release(client, token, "86Box", "86Box").await?;
    let assets = json["assets"].as_array().ok_or("No assets found for 86Box")?;

    #[cfg(target_os = "windows")]
    let pattern = "windows-x64";
    #[cfg(target_os = "linux")]
    let pattern = "linux-x86_64";
    #[cfg(target_os = "macos")]
    let pattern = "macos";

    let asset = assets
        .iter()
        .find(|a| {
            let name = a["name"].as_str().unwrap_or("").to_lowercase();
            name.contains(pattern)
        })
        .ok_or("No matching 86Box asset for current OS")?;

    let dl_url = asset["browser_download_url"].as_str().ok_or("No download URL")?;
    let fname = asset["name"].as_str().unwrap_or("86Box.zip");
    let download_target = box_dir.join(fname);

    emit_progress("Downloading 86Box into 86box/...", 92.0);

    let res = client.get(dl_url).header("User-Agent", "emu-manager").send().await.map_err(|e| e.to_string())?;
    let bytes = res.bytes().await.map_err(|e| e.to_string())?;
    fs::write(&download_target, &bytes).map_err(|e| e.to_string())?;

    #[cfg(target_os = "linux")]
    if fname.ends_with(".AppImage") {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&download_target).map_err(|e| e.to_string())?.permissions();
        perms.set_mode(0o755);
        let _ = fs::set_permissions(&download_target, perms);
        return Ok(());
    }

    if fname.to_lowercase().ends_with(".zip") {
        emit_progress("Extracting 86Box into 86box/...", 94.0);
        let target_clone = download_target.clone();
        let box_dir_clone = box_dir.clone();
        tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
            let zip_file = fs::File::open(&target_clone).map_err(|e| e.to_string())?;
            let mut archive = zip::ZipArchive::new(zip_file).map_err(|e| e.to_string())?;
            archive.extract(&box_dir_clone).map_err(|e| e.to_string())?;
            let _ = fs::remove_file(&target_clone);
            Ok(())
        })
        .await
        .map_err(|e| e.to_string())??;
    }

    Ok(())
}

#[tauri::command]
pub fn cancel_download(flag: State<CancelFlag>) {
    flag.0.store(true, Ordering::Relaxed);
}

#[tauri::command]
pub async fn download_and_install(
    app: tauri::AppHandle,
    flag: State<'_, CancelFlag>,
    owner: String,
    repo: String,
    asset_pattern: String,
    install_path: String,
    emulator_id: String,
    custom_source: Option<CustomSource>,
    channel: Option<String>,
    portable: Option<bool>,
    portable_type: Option<String>,
    portable_target: Option<String>,
) -> Result<String, String> {
    flag.0.store(false, Ordering::Relaxed);

    let token = get_github_token(&app);

    let emit_progress = |status: &str, progress: f64| {
        let _ = app.emit("install-progress", ProgressPayload {
            status: status.to_string(),
            progress,
        });
    };

    emit_progress("Fetching release info...", 5.0);

    let client = create_http_client();

    let (tag, download_url, file_name_owned) = if let Some(source) = custom_source {
        let mut req = client.get(&source.version_url).header("User-Agent", "emu-manager");
        if let Some(t) = &token {
            if is_github_url(&source.version_url) {
                req = req.header("Authorization", format!("Bearer {}", t));
            }
        }
        let body = req.send().await.map_err(|e| format!("Unable to reach version server ({}): {}", source.version_url, e))?
            .text().await.map_err(|e| e.to_string())?;

        let version = parse_custom_source_version(&source, &body)?;
        let (url, fname) = if let Some(dl_url) = extract_custom_source_artifact(&body, &asset_pattern) {
            let f = dl_url.split('/').last().unwrap_or("download.7z").to_string();
            (dl_url, f)
        } else {
            let u = source.download_url_template.replace("{version}", &version);
            let f = u.split('/').last().unwrap_or("download.7z").to_string();
            (u, f)
        };

        (version, url, fname)
    } else {
        let json = fetch_github_release(&client, token.as_deref(), &owner, &repo, channel.as_deref()).await?;
        let raw_tag = json["tag_name"].as_str().unwrap_or("unknown");
        let name = json["name"].as_str();
        let body = json["body"].as_str();
        let published_at = json["published_at"].as_str();

        let assets = json["assets"].as_array().ok_or("No assets found")?;
        let asset = assets.iter()
            .find(|a| a["name"].as_str().unwrap_or("").to_lowercase().contains(&asset_pattern.to_lowercase()))
            .ok_or("No matching asset found")?;
        let dl_url = asset["browser_download_url"].as_str().ok_or("No download URL")?.to_string();
        let fname = asset["name"].as_str().unwrap_or("download.zip").to_string();

        let tag = resolve_release_version(raw_tag, name, body, published_at, Some(&fname));
        (tag, dl_url, fname)
    };

    let dest_dir = PathBuf::from(&install_path);
    fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;
    let file_path = dest_dir.join(&file_name_owned);

    emit_progress("Starting download...", 10.0);

    let res = client.get(&download_url)
        .header("User-Agent", "emu-manager")
        .send().await.map_err(|e| format!("Failed to download file from {}: {}", download_url, e))?;

    let total_size = res.content_length().unwrap_or(0) as f64;
    let mut file = fs::File::create(&file_path).map_err(|e| e.to_string())?;
    let mut downloaded: f64 = 0.0;
    let mut stream = res.bytes_stream();

    while let Some(item) = stream.next().await {
        if flag.0.load(Ordering::Relaxed) {
            drop(file);
            let _ = fs::remove_dir_all(&dest_dir);
            return Err("cancelled".to_string());
        }
        let chunk = item.map_err(|e| e.to_string())?;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as f64;
        if total_size > 0.0 {
            let percentage = 10.0 + ((downloaded / total_size) * 70.0);
            emit_progress(
                &format!("Downloading... {:.1}/{:.1} MB", downloaded / 1_048_576.0, total_size / 1_048_576.0),
                percentage,
            );
        }
    }
    drop(file);

    #[cfg(target_os = "linux")]
    if file_name_owned.ends_with(".AppImage") {
        use std::os::unix::fs::PermissionsExt;
        emit_progress("Setting permissions...", 90.0);
        let mut perms = fs::metadata(&file_path).map_err(|e| e.to_string())?.permissions();
        perms.set_mode(0o755);
        let _ = fs::set_permissions(&file_path, perms).map_err(|e| e.to_string())?;
        fs::write(dest_dir.join("version.txt"), &tag).map_err(|e| e.to_string())?;
        if let Some(ch) = &channel {
            let _ = fs::write(dest_dir.join("channel.txt"), ch);
        }

        if emulator_id == "avalonia86" {
            let _ = setup_avalonia_86box(&client, token.as_deref(), &dest_dir, &emit_progress).await;
        }

        if portable.unwrap_or(true) {
            let _ = fs::write(dest_dir.join(".portable"), "true");
            apply_portable_mode(&dest_dir, portable_type.as_deref(), portable_target.as_deref());
        } else {
            let _ = fs::remove_file(dest_dir.join(".portable"));
        }

        emit_progress("Installation complete!", 100.0);
        return Ok(tag);
    }

    emit_progress("Extracting archive...", 85.0);

    let file_path_clone = file_path.clone();
    let dest_dir_clone = dest_dir.clone();
    let file_name_clone = file_name_owned.clone();

    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        if file_name_clone.to_lowercase().ends_with(".7z") {
            sevenz_rust::decompress_file(&file_path_clone, &dest_dir_clone)
                .map_err(|e| e.to_string())?;
        } else {
            let zip_file = fs::File::open(&file_path_clone).map_err(|e| e.to_string())?;
            let mut archive = zip::ZipArchive::new(zip_file).map_err(|e| e.to_string())?;
            archive.extract(&dest_dir_clone).map_err(|e| e.to_string())?;
        }
        let _ = fs::remove_file(&file_path_clone);
        let _ = flatten_single_directory(&dest_dir_clone);
        Ok(())
    }).await.map_err(|e| e.to_string())??;

    if emulator_id == "avalonia86" {
        let _ = setup_avalonia_86box(&client, token.as_deref(), &dest_dir, &emit_progress).await;
    }

    emit_progress("Finishing setup...", 96.0);
    fs::write(dest_dir.join("version.txt"), &tag).map_err(|e| e.to_string())?;
    if let Some(ch) = &channel {
        let _ = fs::write(dest_dir.join("channel.txt"), ch);
    }

    if portable.unwrap_or(true) {
        let _ = fs::write(dest_dir.join(".portable"), "true");
        apply_portable_mode(&dest_dir, portable_type.as_deref(), portable_target.as_deref());
    } else {
        let _ = fs::remove_file(dest_dir.join(".portable"));
    }

    emit_progress("Installation complete!", 100.0);

    Ok(tag)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_flatten_single_directory() {
        let temp_dir = std::env::temp_dir().join(format!("test_flatten_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
        let sub_dir = temp_dir.join("Dolphin-x64");
        fs::create_dir_all(&sub_dir).unwrap();
        fs::write(sub_dir.join("Dolphin.exe"), b"exe").unwrap();
        fs::write(sub_dir.join("Sys.txt"), b"sys").unwrap();

        flatten_single_directory(&temp_dir).unwrap();

        assert!(temp_dir.join("Dolphin.exe").exists());
        assert!(temp_dir.join("Sys.txt").exists());
        assert!(!sub_dir.exists());

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
