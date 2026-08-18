#[cfg(windows)]
mod autostart_win;

use tauri_plugin_autostart::ManagerExt;

/// 开机项注册表键名固定用 ASCII，避免中文产品名导致 Windows 删不掉。
const AUTOSTART_APP_NAME: &str = "dandan-note";

#[tauri::command]
fn set_autostart(app: tauri::AppHandle, enabled: bool) -> Result<bool, String> {
    let manager = app.autolaunch();

    #[cfg(windows)]
    autostart_win::remove_stale_entries();

    if enabled {
        manager.enable().map_err(|err| err.to_string())?;
    } else {
        match manager.disable() {
            Ok(()) => {}
            Err(err) if is_missing_autostart_entry(&err.to_string()) => {}
            Err(err) => {
                #[cfg(windows)]
                autostart_win::remove_stale_entries();
                if manager.is_enabled().unwrap_or(true) {
                    return Err(err.to_string());
                }
            }
        }
        #[cfg(windows)]
        autostart_win::remove_stale_entries();
    }

    manager.is_enabled().map_err(|err| err.to_string())
}

fn is_missing_autostart_entry(message: &str) -> bool {
    let lower = message.to_ascii_lowercase();
    lower.contains("cannot find")
        || lower.contains("os error 2")
        || message.contains("找不到")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .app_name(AUTOSTART_APP_NAME)
                .build(),
        )
        .plugin(tauri_plugin_sql::Builder::new().build())
        .invoke_handler(tauri::generate_handler![set_autostart])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            #[cfg(windows)]
            {
                if !app.autolaunch().is_enabled().unwrap_or(false) {
                    autostart_win::remove_stale_entries();
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
