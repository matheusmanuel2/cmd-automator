mod automations;
mod commands;
mod errors;
mod pty_manager;

use std::sync::Mutex;
use tauri::Manager;

use automations::AutomationStore;
use pty_manager::PtyManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(PtyManager::new())
        .setup(|app| {
            let store = AutomationStore::load(&app.handle())?;
            app.manage(Mutex::new(store));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_automations,
            commands::get_automation,
            commands::create_automation,
            commands::update_automation,
            commands::delete_automation,
            commands::start_automation,
            commands::start_free_terminal,
            commands::write_to_pty,
            commands::resize_pty,
            commands::stop_pty,
            commands::stop_automation,
            commands::get_pty_backlog,
            commands::list_active_sessions,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let pty_manager = window.app_handle().state::<PtyManager>();
                pty_manager.kill_all();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
