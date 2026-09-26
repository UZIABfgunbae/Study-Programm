mod obsidian;
mod storage;

use serde_json::Value;
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_notification::NotificationExt;

use obsidian::{DailyEntry, TaskPayload, VaultTask};

// ------------------------------------------------------------ Datenhaltung

#[tauri::command]
fn load_state(app: AppHandle) -> Result<Option<Value>, String> {
    storage::load(&app)
}

#[tauri::command]
fn save_state(app: AppHandle, state: Value) -> Result<(), String> {
    storage::save(&app, &state)
}

#[tauri::command]
fn data_file_path(app: AppHandle) -> Result<String, String> {
    Ok(storage::data_path(&app)?.to_string_lossy().to_string())
}

// ------------------------------------------------------------ Fenster & OS

#[tauri::command]
fn set_window_title(app: AppHandle, title: String) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_title(&title);
    }
}

#[tauri::command]
fn focus_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn notify(app: AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| format!("Benachrichtigung fehlgeschlagen: {e}"))
}

// ------------------------------------------------------------ Dateidialoge

/// Nativer Ordner-Dialog (fuer die Vault-Auswahl).
/// Als async-Command laeuft das auf einem eigenen Thread, deshalb ist die
/// blocking-API hier der von Tauri empfohlene Weg.
#[tauri::command]
async fn pick_folder(app: AppHandle, title: Option<String>) -> Option<String> {
    let mut builder = app.dialog().file();
    if let Some(t) = title {
        builder = builder.set_title(t);
    }
    let picked = builder.blocking_pick_folder()?;
    picked
        .as_path()
        .map(|p| p.to_string_lossy().to_string())
        .or_else(|| Some(picked.to_string()))
}

/// Speichern-Dialog + Datei schreiben (fuer den CSV-Export).
#[tauri::command]
async fn export_text_file(
    app: AppHandle,
    default_name: String,
    contents: String,
) -> Result<Option<String>, String> {
    let picked = match app
        .dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("CSV", &["csv"])
        .blocking_save_file()
    {
        Some(p) => p,
        None => return Ok(None),
    };
    let path = picked
        .as_path()
        .map(|p| p.to_path_buf())
        .ok_or_else(|| "Ungueltiger Zielpfad".to_string())?;
    storage::write_atomic(&path, &contents)?;
    Ok(Some(path.to_string_lossy().to_string()))
}

// ------------------------------------------------------- Obsidian-Integration

#[tauri::command]
fn vault_check(vault: String) -> Result<bool, String> {
    obsidian::check_vault(&vault)
}

#[tauri::command]
fn vault_scan_tasks(vault: String, folder: String) -> Result<Vec<VaultTask>, String> {
    obsidian::scan_tasks(&vault, &folder)
}

#[tauri::command]
fn vault_write_task(
    vault: String,
    folder: String,
    task: TaskPayload,
    lang: Option<String>,
) -> Result<String, String> {
    obsidian::write_task(&vault, &folder, &task, lang.as_deref().unwrap_or("de"))
}

#[tauri::command]
fn vault_delete_task(vault: String, folder: String, file: String) -> Result<(), String> {
    obsidian::delete_task(&vault, &folder, &file)
}

#[tauri::command]
fn vault_append_daily(
    vault: String,
    folder: String,
    entry: DailyEntry,
    lang: Option<String>,
) -> Result<String, String> {
    obsidian::append_daily(&vault, &folder, &entry, lang.as_deref().unwrap_or("de"))
}

// ------------------------------------------------------------------- Bootstrap

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            load_state,
            save_state,
            data_file_path,
            set_window_title,
            focus_window,
            notify,
            pick_folder,
            export_text_file,
            vault_check,
            vault_scan_tasks,
            vault_write_task,
            vault_delete_task,
            vault_append_daily,
        ])
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten der Anwendung");
}
