//! Windows 开机启动残留清理。
//!
//! `tauri-plugin-autostart` 在 Windows 上只删 `Run` 里当前 app 名，且中文名
//! 删除常失败；任务管理器的 `StartupApproved` 也不会被清掉。取消勾选后仍会自启。

#![cfg(windows)]

use std::path::PathBuf;
use winreg::enums::{HKEY_CURRENT_USER, KEY_SET_VALUE};
use winreg::RegKey;

/// 历史上可能写入注册表的名字（产品名、Cargo 包名、旧 identifier）。
const STALE_VALUE_NAMES: &[&str] = &[
    "dandan-note",
    "蛋蛋便签",
    "app",
    "com.desktop.notewidget",
];

pub fn remove_stale_entries() {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    for subkey in [
        r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
        r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run",
    ] {
        if let Ok(key) = hkcu.open_subkey_with_flags(subkey, KEY_SET_VALUE) {
            for name in STALE_VALUE_NAMES {
                let _ = key.delete_value(name);
            }
        }
    }
    remove_startup_shortcuts();
}

fn remove_startup_shortcuts() {
    let Ok(appdata) = std::env::var("APPDATA") else {
        return;
    };
    let dir = PathBuf::from(appdata).join(r"Microsoft\Windows\Start Menu\Programs\Startup");
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_lowercase();
        if name.contains("dandan-note") || name.contains("蛋蛋便签") || name.contains("notewidget")
        {
            let _ = std::fs::remove_file(entry.path());
        }
    }
}
