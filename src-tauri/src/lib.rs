pub mod config;
pub mod emulator;
pub mod installer;
pub mod models;

use models::CancelFlag;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(CancelFlag(Arc::new(AtomicBool::new(false))))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            emulator::list_emulators,
            emulator::get_latest_version,
            emulator::check_install_status,
            emulator::launch_emulator,
            emulator::remove_emulator,
            emulator::open_folder,
            installer::download_and_install,
            installer::cancel_download,
            config::save_default_path,
            config::load_default_path,
            config::get_emulator_path,
            config::save_emulator_path,
            config::save_github_token,
            config::load_github_token,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
