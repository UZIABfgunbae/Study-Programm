//! Lokale Datenhaltung: eine JSON-Datei im App-Data-Verzeichnis.
//! Das Frontend besitzt das Schema, Rust kuemmert sich nur um sicheres Lesen/Schreiben.

use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

use serde_json::Value;
use tauri::{AppHandle, Manager};

const DATA_FILE: &str = "data.json";

fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("App-Data-Verzeichnis nicht ermittelbar: {e}"))?;
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Konnte {dir:?} nicht anlegen: {e}"))?;
    }
    Ok(dir)
}

pub fn data_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(data_dir(app)?.join(DATA_FILE))
}

/// Schreibt erst in eine temporaere Datei und benennt dann um,
/// damit ein Absturz mitten im Schreiben die Daten nicht zerstoert.
pub fn write_atomic(path: &Path, contents: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Konnte {parent:?} nicht anlegen: {e}"))?;
        }
    }
    let tmp = path.with_extension("tmp");
    {
        let mut file = fs::File::create(&tmp).map_err(|e| format!("Schreibfehler {tmp:?}: {e}"))?;
        file.write_all(contents.as_bytes())
            .map_err(|e| format!("Schreibfehler {tmp:?}: {e}"))?;
        file.sync_all().ok();
    }
    // Unter Windows schlaegt rename fehl, wenn das Ziel existiert.
    if path.exists() {
        fs::remove_file(path).map_err(|e| format!("Konnte {path:?} nicht ersetzen: {e}"))?;
    }
    fs::rename(&tmp, path).map_err(|e| format!("Konnte {tmp:?} nicht umbenennen: {e}"))?;
    Ok(())
}

/// Erlaubt ein UTF-8-BOM am Dateianfang — Editoren unter Windows (Notepad,
/// PowerShell) schreiben eins, und serde wuerde daran scheitern.
pub fn parse_state(raw: &str) -> Result<Option<Value>, serde_json::Error> {
    let cleaned = raw.trim_start_matches('\u{feff}').trim();
    if cleaned.is_empty() {
        return Ok(None);
    }
    serde_json::from_str(cleaned).map(Some)
}

pub fn load(app: &AppHandle) -> Result<Option<Value>, String> {
    let path = data_path(app)?;
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(&path).map_err(|e| format!("Lesefehler {path:?}: {e}"))?;
    match parse_state(&raw) {
        Ok(v) => Ok(v),
        Err(e) => {
            // Defekte Datei nicht loeschen, sondern zur Seite legen.
            let backup = path.with_extension("corrupt.json");
            let _ = fs::rename(&path, &backup);
            Err(format!(
                "data.json war beschaedigt ({e}) und wurde nach {backup:?} verschoben."
            ))
        }
    }
}

pub fn save(app: &AppHandle, state: &Value) -> Result<(), String> {
    let path = data_path(app)?;
    let text = serde_json::to_string_pretty(state).map_err(|e| format!("JSON-Fehler: {e}"))?;
    write_atomic(&path, &text)
}


#[cfg(test)]
mod tests {
    use super::parse_state;

    #[test]
    fn accepts_plain_json() {
        let parsed = parse_state(r#"{"a":1}"#).unwrap().unwrap();
        assert_eq!(parsed["a"], 1);
    }

    #[test]
    fn accepts_utf8_bom() {
        let with_bom = "\u{feff}{\"a\":1}";
        let parsed = parse_state(with_bom).unwrap().unwrap();
        assert_eq!(parsed["a"], 1);
    }

    #[test]
    fn empty_file_is_no_data() {
        assert!(parse_state("").unwrap().is_none());
        assert!(parse_state("\u{feff}   \n").unwrap().is_none());
    }

    #[test]
    fn broken_json_is_an_error() {
        assert!(parse_state("{nope").is_err());
    }
}
