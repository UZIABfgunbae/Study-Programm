//! Obsidian-Integration: Aufgaben als Markdown-Dateien mit YAML-Frontmatter,
//! plus Tagesnotizen fuer abgeschlossene Lernsessions.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

use serde::{Deserialize, Serialize};

use crate::storage::write_atomic;

// ---------------------------------------------------------------- Datentypen

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskPayload {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub category: String,
    #[serde(default)]
    pub estimate_sec: i64,
    #[serde(default)]
    pub done: bool,
    /// "none" | "important" | "urgent" | "both"
    #[serde(default)]
    pub priority: String,
    #[serde(default)]
    pub note: String,
    #[serde(default)]
    pub created: String,
    /// Bereits vorhandener Dateiname (relativ zum Aufgaben-Ordner), falls bekannt.
    #[serde(default)]
    pub file: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultTask {
    pub file: String,
    pub mtime_ms: i64,
    pub app_id: Option<String>,
    pub title: String,
    pub category: String,
    pub estimate_sec: i64,
    pub done: bool,
    pub priority: String,
    pub note: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyEntry {
    /// YYYY-MM-DD
    pub date: String,
    /// HH:MM
    pub start_time: String,
    /// HH:MM
    pub end_time: String,
    pub minutes: i64,
    #[serde(default)]
    pub task_title: String,
    #[serde(default)]
    pub category: String,
    /// 0 = keine Angabe, sonst 1..5
    #[serde(default)]
    pub focus: i64,
    #[serde(default)]
    pub reflection: String,
    #[serde(default)]
    pub completed_tasks: Vec<String>,
}

// ------------------------------------------------------------- Sprachlabels

/// Beschriftungen, die im Vault landen. Geschrieben wird in der Anzeigesprache,
/// gelesen werden immer beide Varianten — dadurch bleiben bestehende Notizen
/// nach einem Sprachwechsel lesbar.
struct Labels {
    task_tag: &'static str,
    important_tag: &'static str,
    urgent_tag: &'static str,
    note_heading: &'static str,
    no_note: &'static str,
    sessions_heading: &'static str,
    learned: &'static str,
    completed: &'static str,
    focus: &'static str,
    minutes_key: &'static str,
    daily_tags: &'static str,
    prio_normal: &'static str,
    prio_important: &'static str,
    prio_urgent: &'static str,
    prio_both: &'static str,
}

const DE: Labels = Labels {
    task_tag: "lernaufgabe",
    important_tag: "wichtig",
    urgent_tag: "dringend",
    note_heading: "Notiz",
    no_note: "_(keine Notiz)_",
    sessions_heading: "Lernsessions",
    learned: "Gelernt",
    completed: "Erledigt",
    focus: "Fokus",
    minutes_key: "lernzeit_minuten",
    daily_tags: "[tagesnotiz, lernen]",
    prio_normal: "normal",
    prio_important: "wichtig",
    prio_urgent: "dringend",
    prio_both: "wichtig-dringend",
};

const EN: Labels = Labels {
    task_tag: "study-task",
    important_tag: "important",
    urgent_tag: "urgent",
    note_heading: "Note",
    no_note: "_(no note)_",
    sessions_heading: "Study sessions",
    learned: "Learned",
    completed: "Completed",
    focus: "Focus",
    minutes_key: "study_minutes",
    daily_tags: "[daily-note, study]",
    prio_normal: "normal",
    prio_important: "important",
    prio_urgent: "urgent",
    prio_both: "important-urgent",
};

fn labels(lang: &str) -> &'static Labels {
    if lang.eq_ignore_ascii_case("en") {
        &EN
    } else {
        &DE
    }
}

// ------------------------------------------------------------------ Helpers

fn ensure_dir(dir: &Path) -> Result<(), String> {
    if !dir.exists() {
        fs::create_dir_all(dir).map_err(|e| format!("Konnte Ordner {dir:?} nicht anlegen: {e}"))?;
    }
    Ok(())
}

fn folder_path(vault: &str, folder: &str) -> PathBuf {
    let base = PathBuf::from(vault);
    let folder = folder.trim().trim_matches('/').trim_matches('\\');
    if folder.is_empty() {
        base
    } else {
        base.join(folder)
    }
}

/// Dateiname ohne fuer Windows/Linux problematische Zeichen.
fn slugify(title: &str) -> String {
    let mut out = String::new();
    for ch in title.chars() {
        match ch {
            '\\' | '/' | ':' | '*' | '?' | '"' | '<' | '>' | '|' | '#' | '^' | '[' | ']' => {
                out.push('-')
            }
            c if c.is_control() => {}
            c => out.push(c),
        }
    }
    let out = out.trim().trim_matches('.').trim().to_string();
    if out.is_empty() {
        "Aufgabe".to_string()
    } else if out.chars().count() > 80 {
        out.chars().take(80).collect()
    } else {
        out
    }
}

/// Obsidian-Tag aus einem Fachnamen: keine Leerzeichen erlaubt.
fn tagify(value: &str) -> String {
    value
        .trim()
        .chars()
        .map(|c| if c.is_whitespace() { '-' } else { c })
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_' || *c == '/')
        .collect()
}

fn yaml_value(value: &str) -> String {
    if value.is_empty() {
        return "\"\"".into();
    }
    let needs_quotes = value.contains(':')
        || value.contains('#')
        || value.contains('"')
        || value.starts_with('[')
        || value.starts_with('{')
        || value.starts_with('-')
        || value.trim() != value;
    if needs_quotes {
        format!("\"{}\"", value.replace('\\', "\\\\").replace('"', "\\\""))
    } else {
        value.to_string()
    }
}

fn unquote(value: &str) -> String {
    let v = value.trim();
    if v.len() >= 2
        && ((v.starts_with('"') && v.ends_with('"'))
            || (v.starts_with('\'') && v.ends_with('\'')))
    {
        let inner = &v[1..v.len() - 1];
        inner.replace("\\\"", "\"").replace("\\\\", "\\")
    } else {
        v.to_string()
    }
}

/// Trennt YAML-Frontmatter (Reihenfolge erhalten) vom restlichen Text.
fn split_frontmatter(raw: &str) -> (Vec<(String, String)>, String) {
    let normalized = raw.replace("\r\n", "\n");
    if !normalized.starts_with("---\n") {
        return (Vec::new(), normalized);
    }
    let rest = &normalized[4..];
    if let Some(end) = rest.find("\n---") {
        let block = &rest[..end];
        let after = &rest[end + 4..];
        let after = after.strip_prefix('\n').unwrap_or(after);
        let mut pairs = Vec::new();
        for line in block.lines() {
            if line.trim().is_empty() || line.starts_with(' ') || line.starts_with('-') {
                continue;
            }
            if let Some((k, v)) = line.split_once(':') {
                pairs.push((k.trim().to_string(), v.trim().to_string()));
            }
        }
        (pairs, after.to_string())
    } else {
        (Vec::new(), normalized)
    }
}

fn fm_get(pairs: &[(String, String)], key: &str) -> Option<String> {
    pairs
        .iter()
        .find(|(k, _)| k.eq_ignore_ascii_case(key))
        .map(|(_, v)| unquote(v))
}

fn fm_set(pairs: &mut Vec<(String, String)>, key: &str, value: String) {
    if let Some(slot) = pairs.iter_mut().find(|(k, _)| k.eq_ignore_ascii_case(key)) {
        slot.1 = value;
    } else {
        pairs.push((key.to_string(), value));
    }
}

fn render_frontmatter(pairs: &[(String, String)]) -> String {
    let mut out = String::from("---\n");
    for (k, v) in pairs {
        out.push_str(k);
        out.push_str(": ");
        out.push_str(v);
        out.push('\n');
    }
    out.push_str("---\n");
    out
}

fn mtime_ms(path: &Path) -> i64 {
    fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn priority_label(priority: &str, l: &Labels) -> &'static str {
    match priority {
        "important" => l.prio_important,
        "urgent" => l.prio_urgent,
        "both" => l.prio_both,
        _ => l.prio_normal,
    }
}

/// Versteht deutsche und englische Schreibweisen.
fn priority_from_label(label: &str) -> String {
    match label.trim() {
        "wichtig" | "important" => "important".into(),
        "dringend" | "urgent" => "urgent".into(),
        "wichtig-dringend" | "wichtig+dringend" | "important-urgent" | "important+urgent" => {
            "both".into()
        }
        _ => "none".into(),
    }
}

// ------------------------------------------------------------- Vault pruefen

pub fn check_vault(vault: &str) -> Result<bool, String> {
    let base = PathBuf::from(vault);
    if !base.exists() {
        return Err(format!("Ordner existiert nicht: {vault}"));
    }
    if !base.is_dir() {
        return Err(format!("Kein Ordner: {vault}"));
    }
    // .obsidian ist ein guter Hinweis, aber kein Muss (frischer Vault).
    Ok(base.join(".obsidian").exists())
}

// --------------------------------------------------------- Aufgaben schreiben

pub fn write_task(
    vault: &str,
    folder: &str,
    task: &TaskPayload,
    lang: &str,
) -> Result<String, String> {
    let l = labels(lang);
    let dir = folder_path(vault, folder);
    ensure_dir(&dir)?;

    // Ziel-Datei bestimmen: bestehende weiterverwenden, sonst aus Titel ableiten.
    let file_name = match task.file.as_deref().filter(|f| !f.trim().is_empty()) {
        Some(existing) => existing.to_string(),
        None => {
            let base = slugify(&task.title);
            let mut candidate = format!("{base}.md");
            let mut n = 2;
            while dir.join(&candidate).exists() {
                candidate = format!("{base} {n}.md");
                n += 1;
            }
            candidate
        }
    };
    let path = dir.join(&file_name);

    // Unbekannte Frontmatter-Felder des Nutzers erhalten.
    let mut pairs: Vec<(String, String)> = if path.exists() {
        let raw = fs::read_to_string(&path).unwrap_or_default();
        split_frontmatter(&raw).0
    } else {
        Vec::new()
    };

    let mut tags = vec![l.task_tag.to_string()];
    let cat_tag = tagify(&task.category);
    if !cat_tag.is_empty() {
        tags.push(cat_tag.clone());
    }
    if task.priority == "urgent" || task.priority == "both" {
        tags.push(l.urgent_tag.into());
    }
    if task.priority == "important" || task.priority == "both" {
        tags.push(l.important_tag.into());
    }

    let minutes = (task.estimate_sec as f64 / 60.0).round() as i64;
    fm_set(&mut pairs, "title", yaml_value(&task.title));
    fm_set(&mut pairs, "tags", format!("[{}]", tags.join(", ")));
    fm_set(&mut pairs, "created", yaml_value(&task.created));
    fm_set(
        &mut pairs,
        "time_required",
        yaml_value(&format!("{minutes}min")),
    );
    fm_set(&mut pairs, "estimate_seconds", task.estimate_sec.to_string());
    fm_set(&mut pairs, "done", task.done.to_string());
    fm_set(
        &mut pairs,
        "priority",
        yaml_value(priority_label(&task.priority, l)),
    );
    fm_set(&mut pairs, "category", yaml_value(&task.category));
    fm_set(&mut pairs, "app_id", yaml_value(&task.id));

    let checkbox = if task.done { "x" } else { " " };
    let mut body = String::new();
    body.push_str(&format!("# {}\n\n", task.title));
    body.push_str(&format!("- [{checkbox}] {}", task.title));
    if !cat_tag.is_empty() {
        body.push_str(&format!(" #{cat_tag}"));
    }
    body.push_str(&format!("  (~{minutes} min)\n"));
    body.push_str(&format!("\n## {}\n\n", l.note_heading));
    if task.note.trim().is_empty() {
        body.push_str(l.no_note);
        body.push('\n');
    } else {
        body.push_str(task.note.trim());
        body.push('\n');
    }

    write_atomic(&path, &format!("{}{}", render_frontmatter(&pairs), body))?;
    Ok(file_name)
}

pub fn delete_task(vault: &str, folder: &str, file: &str) -> Result<(), String> {
    let path = folder_path(vault, folder).join(file);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Konnte {path:?} nicht loeschen: {e}"))?;
    }
    Ok(())
}

// ----------------------------------------------------------- Aufgaben lesen

fn parse_task_file(path: &Path, file_name: String) -> Option<VaultTask> {
    let raw = fs::read_to_string(path).ok()?;
    let (pairs, body) = split_frontmatter(&raw);

    // Checkbox-Zeile suchen: sie ist in Obsidian die natuerliche Interaktion.
    let mut done_from_box: Option<bool> = None;
    let mut checkbox_title: Option<String> = None;
    for line in body.lines() {
        let t = line.trim_start();
        let lower = t.to_ascii_lowercase();
        if lower.starts_with("- [x]") || lower.starts_with("- [ ]") {
            done_from_box = Some(lower.starts_with("- [x]"));
            let text = t[5..].trim();
            // Tags und Zeitangabe am Ende entfernen.
            let cleaned: String = text
                .split_whitespace()
                .filter(|w| !w.starts_with('#') && !w.starts_with("(~"))
                .collect::<Vec<_>>()
                .join(" ");
            let cleaned = cleaned.trim_end_matches("min)").trim().to_string();
            if !cleaned.is_empty() {
                checkbox_title = Some(cleaned);
            }
            break;
        }
    }

    // Notiz: Abschnitt "## Notiz" / "## Note", sonst restlicher Text.
    let heading = body
        .find("## Notiz")
        .map(|i| (i, "## Notiz".len()))
        .or_else(|| body.find("## Note").map(|i| (i, "## Note".len())));
    let note = if let Some((idx, len)) = heading {
        let after = &body[idx + len..];
        let end = after.find("\n## ").unwrap_or(after.len());
        after[..end].trim().to_string()
    } else {
        body.lines()
            .filter(|l| {
                let t = l.trim_start();
                !t.starts_with('#') && !t.to_ascii_lowercase().starts_with("- [")
            })
            .collect::<Vec<_>>()
            .join("\n")
            .trim()
            .to_string()
    };
    let note = if note == DE.no_note || note == EN.no_note {
        String::new()
    } else {
        note
    };

    let title = fm_get(&pairs, "title")
        .filter(|t| !t.is_empty())
        .or(checkbox_title)
        .or_else(|| file_name.strip_suffix(".md").map(|s| s.to_string()))?;

    let estimate_sec = fm_get(&pairs, "estimate_seconds")
        .and_then(|v| v.parse::<i64>().ok())
        .or_else(|| {
            fm_get(&pairs, "time_required").and_then(|v| {
                let digits: String = v.chars().take_while(|c| c.is_ascii_digit()).collect();
                digits.parse::<i64>().ok().map(|m| m * 60)
            })
        })
        .unwrap_or(25 * 60);

    let done = done_from_box.unwrap_or_else(|| {
        fm_get(&pairs, "done")
            .map(|v| v.eq_ignore_ascii_case("true"))
            .unwrap_or(false)
    });

    let priority = fm_get(&pairs, "priority")
        .map(|p| priority_from_label(&p))
        .unwrap_or_else(|| "none".into());

    Some(VaultTask {
        file: file_name,
        mtime_ms: mtime_ms(path),
        app_id: fm_get(&pairs, "app_id").filter(|s| !s.is_empty()),
        title,
        category: fm_get(&pairs, "category").unwrap_or_default(),
        estimate_sec,
        done,
        priority,
        note,
    })
}

pub fn scan_tasks(vault: &str, folder: &str) -> Result<Vec<VaultTask>, String> {
    let dir = folder_path(vault, folder);
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let entries = fs::read_dir(&dir).map_err(|e| format!("Konnte {dir:?} nicht lesen: {e}"))?;
    let mut out = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };
        if let Some(task) = parse_task_file(&path, name) {
            out.push(task);
        }
    }
    out.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
    Ok(out)
}

// ------------------------------------------------------------- Tagesnotizen

pub fn append_daily(
    vault: &str,
    folder: &str,
    entry: &DailyEntry,
    lang: &str,
) -> Result<String, String> {
    let l = labels(lang);
    let dir = folder_path(vault, folder);
    ensure_dir(&dir)?;
    let file_name = format!("{}.md", entry.date);
    let path = dir.join(&file_name);

    let raw = if path.exists() {
        fs::read_to_string(&path).map_err(|e| format!("Konnte {path:?} nicht lesen: {e}"))?
    } else {
        String::new()
    };
    let (mut pairs, mut body) = split_frontmatter(&raw);

    // Beide Schluessel lesen, damit ein Sprachwechsel die Summe nicht verliert.
    let prev_minutes = fm_get(&pairs, l.minutes_key)
        .or_else(|| fm_get(&pairs, DE.minutes_key))
        .or_else(|| fm_get(&pairs, EN.minutes_key))
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(0);
    let prev_sessions = fm_get(&pairs, "sessions")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(0);

    if pairs.is_empty() {
        pairs.push(("tags".into(), l.daily_tags.into()));
        pairs.push(("date".into(), entry.date.clone()));
    } else {
        fm_set(&mut pairs, "date", entry.date.clone());
    }
    fm_set(
        &mut pairs,
        l.minutes_key,
        (prev_minutes + entry.minutes).to_string(),
    );
    fm_set(&mut pairs, "sessions", (prev_sessions + 1).to_string());

    if body.trim().is_empty() {
        body = format!("# {}\n", entry.date);
    }
    let heading = format!("## {}", l.sessions_heading);
    if !body.contains(&heading) {
        if !body.ends_with('\n') {
            body.push('\n');
        }
        body.push_str(&format!("\n{heading}\n"));
    }
    if !body.ends_with('\n') {
        body.push('\n');
    }

    let cat_tag = tagify(&entry.category);
    let mut line = format!(
        "- **{} - {}** ({} min)",
        entry.start_time, entry.end_time, entry.minutes
    );
    if !entry.task_title.trim().is_empty() {
        line.push_str(&format!(
            " -- [[{}]]",
            entry.task_title.replace(['[', ']'], "")
        ));
    }
    if !cat_tag.is_empty() {
        line.push_str(&format!(" #{cat_tag}"));
    }
    if entry.focus > 0 {
        line.push_str(&format!(" -- {}: {}/5", l.focus, entry.focus));
    }
    body.push_str(&line);
    body.push('\n');

    if !entry.reflection.trim().is_empty() {
        let reflection = entry.reflection.trim().replace('\n', " ");
        body.push_str(&format!("    - {}: {reflection}\n", l.learned));
    }
    if !entry.completed_tasks.is_empty() {
        body.push_str(&format!("    - {}: ", l.completed));
        let links: Vec<String> = entry
            .completed_tasks
            .iter()
            .map(|t| format!("[[{}]]", t.replace(['[', ']'], "")))
            .collect();
        body.push_str(&links.join(", "));
        body.push('\n');
    }

    write_atomic(&path, &format!("{}{}", render_frontmatter(&pairs), body))?;
    Ok(path.to_string_lossy().to_string())
}

// ------------------------------------------------------------------- Tests

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_vault(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("study-focus-test-{name}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn sample_task() -> TaskPayload {
        TaskPayload {
            id: "abc123".into(),
            title: "Analysis Kapitel 3".into(),
            category: "Mathe".into(),
            estimate_sec: 2700,
            done: false,
            priority: "important".into(),
            note: "Grenzwerte, siehe [[Analysis Mitschrift]]".into(),
            created: "2026-09-26".into(),
            file: None,
        }
    }

    #[test]
    fn task_roundtrip() {
        let vault = temp_vault("roundtrip");
        let vault_str = vault.to_string_lossy().to_string();
        let file = write_task(&vault_str, "Lernaufgaben", &sample_task(), "de").unwrap();
        assert_eq!(file, "Analysis Kapitel 3.md");

        let raw = fs::read_to_string(vault.join("Lernaufgaben").join(&file)).unwrap();
        assert!(raw.starts_with("---\n"), "Frontmatter fehlt:\n{raw}");
        assert!(raw.contains("time_required: 45min"));
        assert!(raw.contains("tags: [lernaufgabe, Mathe, wichtig]"));
        assert!(raw.contains("- [ ] Analysis Kapitel 3 #Mathe"));
        assert!(raw.contains("[[Analysis Mitschrift]]"));

        let scanned = scan_tasks(&vault_str, "Lernaufgaben").unwrap();
        assert_eq!(scanned.len(), 1);
        let t = &scanned[0];
        assert_eq!(t.title, "Analysis Kapitel 3");
        assert_eq!(t.category, "Mathe");
        assert_eq!(t.estimate_sec, 2700);
        assert_eq!(t.priority, "important");
        assert_eq!(t.app_id.as_deref(), Some("abc123"));
        assert!(!t.done);
        assert!(t.note.contains("[[Analysis Mitschrift]]"));
    }

    #[test]
    fn checkbox_in_obsidian_wins() {
        let vault = temp_vault("checkbox");
        let vault_str = vault.to_string_lossy().to_string();
        let file = write_task(&vault_str, "Lernaufgaben", &sample_task(), "de").unwrap();
        let path = vault.join("Lernaufgaben").join(&file);

        // Nutzer hakt die Aufgabe in Obsidian ab.
        let raw = fs::read_to_string(&path).unwrap().replace("- [ ]", "- [x]");
        fs::write(&path, raw).unwrap();

        let scanned = scan_tasks(&vault_str, "Lernaufgaben").unwrap();
        assert!(scanned[0].done, "Checkbox aus dem Vault wurde nicht uebernommen");
    }

    #[test]
    fn keeps_unknown_frontmatter_fields() {
        let vault = temp_vault("frontmatter");
        let vault_str = vault.to_string_lossy().to_string();
        let file = write_task(&vault_str, "Lernaufgaben", &sample_task(), "de").unwrap();
        let path = vault.join("Lernaufgaben").join(&file);

        let raw = fs::read_to_string(&path).unwrap();
        fs::write(&path, raw.replacen("---\n", "---\nobsidian_feld: behalten\n", 1)).unwrap();

        let mut task = sample_task();
        task.file = Some(file.clone());
        task.done = true;
        write_task(&vault_str, "Lernaufgaben", &task, "de").unwrap();

        let raw = fs::read_to_string(&path).unwrap();
        assert!(raw.contains("obsidian_feld: behalten"), "Eigenes Feld verloren:\n{raw}");
        assert!(raw.contains("done: true"));
        assert!(raw.contains("- [x] Analysis Kapitel 3"));
    }

    #[test]
    fn daily_note_accumulates() {
        let vault = temp_vault("daily");
        let vault_str = vault.to_string_lossy().to_string();
        let entry = DailyEntry {
            date: "2026-09-26".into(),
            start_time: "19:05".into(),
            end_time: "19:30".into(),
            minutes: 25,
            task_title: "Analysis Kapitel 3".into(),
            category: "Mathe".into(),
            focus: 4,
            reflection: "Grenzwertsaetze wiederholt".into(),
            completed_tasks: vec!["Analysis Kapitel 3".into()],
        };
        append_daily(&vault_str, "Tagesnotizen", &entry, "de").unwrap();

        let second = DailyEntry {
            start_time: "20:00".into(),
            end_time: "20:45".into(),
            minutes: 45,
            focus: 0,
            reflection: String::new(),
            completed_tasks: vec![],
            ..entry.clone()
        };
        append_daily(&vault_str, "Tagesnotizen", &second, "de").unwrap();

        let raw = fs::read_to_string(vault.join("Tagesnotizen").join("2026-09-26.md")).unwrap();
        assert!(raw.contains("lernzeit_minuten: 70"), "Summe falsch:\n{raw}");
        assert!(raw.contains("sessions: 2"));
        assert_eq!(raw.matches("## Lernsessions").count(), 1);
        assert!(raw.contains("[[Analysis Kapitel 3]]"));
        assert!(raw.contains("Fokus: 4/5"));
        assert!(raw.contains("- Gelernt: Grenzwertsaetze wiederholt"));
        assert!(raw.contains("(45 min)"));
    }

    #[test]
    fn sanitizes_file_names() {
        let vault = temp_vault("slug");
        let vault_str = vault.to_string_lossy().to_string();
        let mut task = sample_task();
        task.title = "Kapitel 3/4: Grenzwerte?".into();
        let file = write_task(&vault_str, "Lernaufgaben", &task, "de").unwrap();
        assert!(!file.contains('/') && !file.contains(':') && !file.contains('?'), "unsicher: {file}");
        assert!(vault.join("Lernaufgaben").join(&file).exists());
    }

    #[test]
    fn writes_english_labels() {
        let vault = temp_vault("english");
        let vault_str = vault.to_string_lossy().to_string();
        let file = write_task(&vault_str, "Study tasks", &sample_task(), "en").unwrap();

        let raw = fs::read_to_string(vault.join("Study tasks").join(&file)).unwrap();
        assert!(raw.contains("tags: [study-task, Mathe, important]"), "Tags falsch:\n{raw}");
        assert!(raw.contains("priority: important"));
        assert!(raw.contains("## Note"));

        // Englisch geschriebene Datei muss auch wieder gelesen werden koennen.
        let scanned = scan_tasks(&vault_str, "Study tasks").unwrap();
        assert_eq!(scanned.len(), 1);
        assert_eq!(scanned[0].priority, "important");
        assert!(scanned[0].note.contains("Grenzwerte"));
    }

    #[test]
    fn daily_note_survives_language_switch() {
        let vault = temp_vault("langswitch");
        let vault_str = vault.to_string_lossy().to_string();
        let entry = DailyEntry {
            date: "2026-09-26".into(),
            start_time: "19:05".into(),
            end_time: "19:30".into(),
            minutes: 25,
            task_title: "Analysis".into(),
            category: "Mathe".into(),
            focus: 4,
            reflection: "Grenzwerte".into(),
            completed_tasks: vec![],
        };
        append_daily(&vault_str, "Daily", &entry, "de").unwrap();

        // Nutzer stellt auf Englisch um: Summe darf nicht bei 0 neu anfangen.
        let second = DailyEntry {
            minutes: 20,
            focus: 0,
            reflection: String::new(),
            ..entry.clone()
        };
        append_daily(&vault_str, "Daily", &second, "en").unwrap();

        let raw = fs::read_to_string(vault.join("Daily").join("2026-09-26.md")).unwrap();
        assert!(raw.contains("study_minutes: 45"), "Summe verloren:\n{raw}");
        assert!(raw.contains("## Lernsessions"));
        assert!(raw.contains("## Study sessions"));
        assert!(raw.contains("Fokus: 4/5"));
    }

    #[test]
    fn reads_priority_in_both_languages() {
        assert_eq!(priority_from_label("wichtig"), "important");
        assert_eq!(priority_from_label("important"), "important");
        assert_eq!(priority_from_label("dringend"), "urgent");
        assert_eq!(priority_from_label("urgent"), "urgent");
        assert_eq!(priority_from_label("important-urgent"), "both");
        assert_eq!(priority_from_label("wichtig-dringend"), "both");
        assert_eq!(priority_from_label("normal"), "none");
    }
}
