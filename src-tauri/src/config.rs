use std::fs;
use std::path::PathBuf;
use tauri::Manager;

pub fn default_install_dir() -> String {
    #[cfg(target_os = "windows")]
    return "C:\\Emulators".to_string();

    #[cfg(target_os = "linux")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/home/user".to_string());
        return format!("{}/AppImages", home);
    }

    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/user".to_string());
        return format!("{}/Applications", home);
    }
}

pub fn get_github_token(app: &tauri::AppHandle) -> Option<String> {
    let config_dir = app.path().app_config_dir().ok()?;
    let token = fs::read_to_string(config_dir.join("token.txt")).ok()?;
    let token = token.trim().to_string();
    if token.is_empty() { None } else { Some(token) }
}

pub fn load_installs_map(app: &tauri::AppHandle) -> serde_json::Value {
    if let Ok(config_dir) = app.path().app_config_dir() {
        let path = config_dir.join("installs.json");
        if let Ok(content) = fs::read_to_string(path) {
            if let Ok(json) = serde_json::from_str(&content) {
                return json;
            }
        }
    }
    serde_json::Value::Object(serde_json::Map::new())
}

#[tauri::command]
pub fn load_default_path(app: tauri::AppHandle) -> String {
    let config_dir = match app.path().app_config_dir() {
        Ok(p) => p,
        Err(_) => return default_install_dir(),
    };
    let config_file = config_dir.join("config.json");
    if let Ok(content) = fs::read_to_string(config_file) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(p) = json["default_path"].as_str() {
                return p.to_string();
            }
        }
    }
    default_install_dir()
}

#[tauri::command]
pub fn save_default_path(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    fs::write(
        config_dir.join("config.json"),
        format!("{{\"default_path\":\"{}\"}}", path.replace('\\', "\\\\")),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_emulator_path(app: tauri::AppHandle, emulator_id: String) -> String {
    let map = load_installs_map(&app);
    if let Some(custom_path) = map.get(&emulator_id).and_then(|v| v.as_str()) {
        return custom_path.to_string();
    }
    let default_base = load_default_path(app.clone());
    PathBuf::from(default_base).join(&emulator_id).to_string_lossy().to_string()
}

#[tauri::command]
pub fn save_emulator_path(app: tauri::AppHandle, emulator_id: String, path: String) -> Result<(), String> {
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    let mut map = load_installs_map(&app);
    if let Some(obj) = map.as_object_mut() {
        obj.insert(emulator_id, serde_json::Value::String(path));
    }
    let target_file = config_dir.join("installs.json");
    fs::write(target_file, serde_json::to_string_pretty(&map).unwrap_or_default())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_github_token(app: tauri::AppHandle, token: String) -> Result<(), String> {
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    fs::write(config_dir.join("token.txt"), token).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_github_token(app: tauri::AppHandle) -> String {
    let config_dir = match app.path().app_config_dir() {
        Ok(p) => p,
        Err(_) => return "".to_string(),
    };
    fs::read_to_string(config_dir.join("token.txt"))
        .unwrap_or_default()
        .trim()
        .to_string()
}
