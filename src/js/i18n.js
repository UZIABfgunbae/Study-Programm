// Zweisprachigkeit: Deutsch / Englisch.
// Statische Texte tragen im HTML ein data-i18n-Attribut, dynamische Texte
// holen sich ihren String ueber t(). Sprachwechsel ohne Neustart.

const STRINGS = {
  de: {
    "app.name": "Study Focus",

    "tab.focus": "Fokus",
    "tab.tasks": "Aufgaben",
    "tab.goals": "Ziele",
    "tab.stats": "Statistik",
    "tab.settings": "Einstellungen",
    "topbar.today": "{time} heute",
    "topbar.themeToggle": "Hell / Dunkel umschalten",

    "timer.countdown": "Countdown",
    "timer.stopwatch": "Stoppuhr",
    "timer.ready": "bereit",
    "timer.running": "läuft",
    "timer.stopwatchRunning": "Stoppuhr läuft",
    "timer.paused": "pausiert",
    "timer.hours": "Std",
    "timer.minutes": "Min",
    "timer.seconds": "Sek",
    "timer.start": "Start",
    "timer.pause": "Pause",
    "timer.resume": "Weiter",
    "timer.reset": "Reset",
    "timer.finish": "Beenden & speichern",
    "timer.shortcuts": "Leertaste = Start/Pause · R = Reset",
    "timer.presetMinutes": "{n} min",
    "timer.stillRunning": "Timer läuft — erst pausieren oder beenden.",
    "timer.alreadyRunning": "Timer läuft bereits — erst pausieren oder beenden.",
    "timer.tooShort": "Noch zu kurz für eine Session.",
    "timer.partialSaved": "Teil-Session gespeichert: {time}",
    "timer.doneTitle": "Zeit ist um",
    "timer.doneBody": "{time} Lernzeit geschafft.",
    "timer.doneBodyTask": "{task} — {time} geschafft.",

    "focus.currentTask": "Aktuelle Aufgabe",
    "focus.noTask":
      "Keine Aufgabe gewählt — im Tab <strong>Aufgaben</strong> auf eine Aufgabe klicken, um den Timer mit ihrer Zeitvorgabe zu starten.",
    "focus.taskDone": "Aufgabe erledigt",
    "focus.taskClear": "Lösen",
    "focus.taskPlanned": "geplant {time}",
    "focus.taskSpent": "gelernt {time}",
    "focus.taskIsDone": "erledigt",
    "focus.markedDone": "Aufgabe erledigt.",
    "focus.markedOpen": "Aufgabe wieder geöffnet.",
    "focus.sound": "Fokus-Sound",
    "focus.brownNoise": "Brown Noise",
    "focus.volume": "Lautstärke",
    "focus.soundHint": "Läuft unabhängig vom Timer-Signal weiter.",
    "focus.today": "Heute",
    "focus.studyTime": "Lernzeit",
    "focus.studyTimeInfo": "Lernzeit (Info)",
    "focus.tasks": "Aufgaben",
    "focus.streakDay": "🔥 <strong>{n}</strong> Tag Streak",
    "focus.streakDays": "🔥 <strong>{n}</strong> Tage Streak",

    "tasks.newTask": "Neue Aufgabe",
    "tasks.titlePlaceholder": "Was steht an?",
    "tasks.categoryPlaceholder": "Fach / Kategorie",
    "tasks.estimateTitle": "Geschätzte Zeit in Minuten",
    "tasks.unitMin": "min",
    "tasks.priorityTitle": "Priorität",
    "tasks.prio.none": "normal",
    "tasks.prio.important": "wichtig",
    "tasks.prio.urgent": "dringend",
    "tasks.prio.both": "wichtig + dringend",
    "tasks.add": "Hinzufügen",
    "tasks.notePlaceholder": "Kurze Notiz (optional) — #Tags und [[Wikilinks]] erlaubt",
    "tasks.list": "Aufgabenliste",
    "tasks.allCategories": "Alle Fächer",
    "tasks.filterOpen": "Offen",
    "tasks.filterAll": "Alle",
    "tasks.filterDone": "Erledigt",
    "tasks.clearDone": "Erledigte entfernen",
    "tasks.progress": "{done} von {total} Aufgaben erledigt",
    "tasks.empty": "Noch keine Aufgaben — oben eine anlegen.",
    "tasks.emptyFiltered": "Nichts für diesen Filter.",
    "tasks.noCategory": "Ohne Fach",
    "tasks.startHint": "Klicken: Timer mit dieser Zeitvorgabe starten",
    "tasks.checkDone": "Als erledigt markieren",
    "tasks.checkOpen": "Als offen markieren",
    "tasks.edit": "Bearbeiten",
    "tasks.delete": "Löschen",
    "tasks.spent": "gelernt: {time}",
    "tasks.alreadyDone": "Aufgabe ist bereits erledigt.",
    "tasks.noneDone": "Keine erledigten Aufgaben.",
    "tasks.removedDone": "{n} erledigte Aufgabe(n) entfernt.",
    "tasks.titleRequired": "Titel darf nicht leer sein.",
    "tasks.editTitle": "Aufgabe bearbeiten",
    "tasks.fieldTitle": "Titel",
    "tasks.fieldCategory": "Fach",
    "tasks.fieldMinutes": "Minuten",
    "tasks.fieldPriority": "Priorität",
    "tasks.fieldNote": "Notiz",

    "goals.daily": "Tagesziel",
    "goals.weekly": "Wochenziel",
    "goals.mode": "Modus",
    "goals.modeTime": "Lernzeit",
    "goals.modeTasks": "Aufgaben",
    "goals.modeBoth": "Lernzeit + Aufgaben",
    "goals.minutes": "Minuten",
    "goals.tasks": "Aufgaben",
    "goals.timeToday": "Lernzeit heute",
    "goals.tasksToday": "Aufgaben heute",
    "goals.timeWeek": "Lernzeit diese Woche",
    "goals.tasksWeek": "Aufgaben diese Woche",
    "goals.streak": "Streak",
    "goals.streakHint": "Tage in Folge mit erreichtem Tagesziel.",
    "goals.streakHintOpen": "Tage in Folge mit erreichtem Tagesziel. Heute fehlt noch etwas.",
    "goals.streakHintDone": "Tagesziel heute erreicht — stark!",

    "stats.today": "Heute",
    "stats.week": "Diese Woche",
    "stats.total": "Gesamt",
    "stats.sessions": "Sessions",
    "stats.last14": "Letzte 14 Tage",
    "stats.heatmap": "Lern-Heatmap",
    "stats.less": "weniger",
    "stats.more": "mehr",
    "stats.history": "Verlauf",
    "stats.exportCsv": "CSV exportieren",
    "stats.noSessions": "Noch keine Sessions aufgezeichnet.",
    "stats.sessionDefault": "Lernsession",
    "stats.stopwatchSession": "Stoppuhr-Session",
    "stats.focusShort": "Fokus {n}/5",
    "stats.quote": "„{text}“",
    "stats.nothingToExport": "Noch keine Daten zum Exportieren.",
    "stats.exported": "Exportiert nach {path}",
    "stats.exportFailed": "Export fehlgeschlagen",
    "stats.csvFile": "lernstatistik-{date}.csv",
    "stats.csv.date": "Datum",
    "stats.csv.start": "Start",
    "stats.csv.end": "Ende",
    "stats.csv.minutes": "Dauer_Minuten",
    "stats.csv.mode": "Modus",
    "stats.csv.task": "Aufgabe",
    "stats.csv.category": "Fach",
    "stats.csv.focus": "Fokus",
    "stats.csv.reflection": "Reflexion",

    "settings.appearance": "Darstellung",
    "settings.theme": "Design",
    "settings.themeDark": "Dunkel",
    "settings.themeLight": "Hell",
    "settings.themeSystem": "Systemeinstellung",
    "settings.language": "Sprache",
    "settings.languageSystem": "Systemsprache",
    "settings.timer": "Timer",
    "settings.presets": "Presets (Minuten, kommagetrennt)",
    "settings.sound": "Signalton bei Ablauf",
    "settings.notify": "System-Benachrichtigung",
    "settings.reflection": "Reflexion nach jeder Session abfragen",
    "settings.vault": "Obsidian-Vault",
    "settings.vaultPlaceholder": "Kein Vault gewählt",
    "settings.pickFolder": "Ordner wählen",
    "settings.removeVault": "Entfernen",
    "settings.tasksFolder": "Ordner für Aufgaben",
    "settings.dailyFolder": "Ordner für Tagesnotizen",
    "settings.syncTasks": "Aufgaben als Markdown synchronisieren",
    "settings.writeDaily": "Sessions in Tagesnotiz schreiben",
    "settings.syncNow": "Jetzt mit Vault abgleichen",
    "settings.pushAll": "Alle Aufgaben in Vault schreiben",
    "settings.data": "Daten",
    "settings.dataHint": "Alle Aufgaben, Ziele und Statistiken liegen lokal in:",
    "settings.defaultTasksFolder": "Lernaufgaben",
    "settings.defaultDailyFolder": "Tagesnotizen",

    "vault.none": "Kein Vault ausgewählt.",
    "vault.detected": "Vault erkannt (.obsidian gefunden).",
    "vault.noObsidianDir":
      "Ordner gefunden, aber kein .obsidian-Verzeichnis — wird trotzdem verwendet.",
    "vault.pickFirst": "Erst einen Vault-Ordner auswählen.",
    "vault.pickFailed": "Ordnerauswahl fehlgeschlagen",
    "vault.writeError": "Vault-Schreibfehler",
    "vault.deleteError": "Vault-Löschfehler",
    "vault.readError": "Vault konnte nicht gelesen werden",
    "vault.taskError": 'Fehler bei „{task}“',
    "vault.pushed": "{n} Aufgabe(n) in den Vault geschrieben.",
    "vault.synced": "Vault abgeglichen — {imported} neu, {adopted} aktualisiert.",
    "vault.dailyError": "Tagesnotiz konnte nicht geschrieben werden",

    "reflection.title": "Session abgeschlossen",
    "reflection.summary": "{time} gelernt.",
    "reflection.summaryTask": "{time} an „{task}“ gearbeitet.",
    "reflection.question": "Was hast du gelernt?",
    "reflection.placeholder": "Optional — landet in der Obsidian-Tagesnotiz",
    "reflection.focusQuestion": "Wie fokussiert warst du?",
    "reflection.markDone": "Aufgabe als erledigt markieren",
    "reflection.skip": "Überspringen",
    "reflection.save": "Speichern",

    "common.cancel": "Abbrechen",
    "common.save": "Speichern",
    "common.loadFailed": "Daten konnten nicht geladen werden",
    "common.saveFailed": "Speichern fehlgeschlagen",
    "common.startFailed": "Start fehlgeschlagen",
    "common.browserMode":
      "Browser-Modus: Datei- und Obsidian-Funktionen brauchen die Desktop-App.",
    "common.desktopOnly": "Nur in der Desktop-App verfügbar ({cmd})",
  },

  en: {
    "app.name": "Study Focus",

    "tab.focus": "Focus",
    "tab.tasks": "Tasks",
    "tab.goals": "Goals",
    "tab.stats": "Stats",
    "tab.settings": "Settings",
    "topbar.today": "{time} today",
    "topbar.themeToggle": "Toggle light / dark",

    "timer.countdown": "Countdown",
    "timer.stopwatch": "Stopwatch",
    "timer.ready": "ready",
    "timer.running": "running",
    "timer.stopwatchRunning": "stopwatch running",
    "timer.paused": "paused",
    "timer.hours": "Hrs",
    "timer.minutes": "Min",
    "timer.seconds": "Sec",
    "timer.start": "Start",
    "timer.pause": "Pause",
    "timer.resume": "Resume",
    "timer.reset": "Reset",
    "timer.finish": "Finish & save",
    "timer.shortcuts": "Space = start/pause · R = reset",
    "timer.presetMinutes": "{n} min",
    "timer.stillRunning": "Timer is running — pause or finish it first.",
    "timer.alreadyRunning": "Timer is already running — pause or finish it first.",
    "timer.tooShort": "Too short to count as a session.",
    "timer.partialSaved": "Partial session saved: {time}",
    "timer.doneTitle": "Time is up",
    "timer.doneBody": "{time} of study time done.",
    "timer.doneBodyTask": "{task} — {time} done.",

    "focus.currentTask": "Current task",
    "focus.noTask":
      "No task selected — open the <strong>Tasks</strong> tab and click a task to start the timer with its time budget.",
    "focus.taskDone": "Mark task done",
    "focus.taskClear": "Detach",
    "focus.taskPlanned": "planned {time}",
    "focus.taskSpent": "studied {time}",
    "focus.taskIsDone": "done",
    "focus.markedDone": "Task marked as done.",
    "focus.markedOpen": "Task reopened.",
    "focus.sound": "Focus sound",
    "focus.brownNoise": "Brown noise",
    "focus.volume": "Volume",
    "focus.soundHint": "Keeps playing independently of the timer chime.",
    "focus.today": "Today",
    "focus.studyTime": "Study time",
    "focus.studyTimeInfo": "Study time (info)",
    "focus.tasks": "Tasks",
    "focus.streakDay": "🔥 <strong>{n}</strong> day streak",
    "focus.streakDays": "🔥 <strong>{n}</strong> day streak",

    "tasks.newTask": "New task",
    "tasks.titlePlaceholder": "What's up next?",
    "tasks.categoryPlaceholder": "Subject / category",
    "tasks.estimateTitle": "Estimated time in minutes",
    "tasks.unitMin": "min",
    "tasks.priorityTitle": "Priority",
    "tasks.prio.none": "normal",
    "tasks.prio.important": "important",
    "tasks.prio.urgent": "urgent",
    "tasks.prio.both": "important + urgent",
    "tasks.add": "Add",
    "tasks.notePlaceholder": "Short note (optional) — #tags and [[wikilinks]] allowed",
    "tasks.list": "Task list",
    "tasks.allCategories": "All subjects",
    "tasks.filterOpen": "Open",
    "tasks.filterAll": "All",
    "tasks.filterDone": "Done",
    "tasks.clearDone": "Remove completed",
    "tasks.progress": "{done} of {total} tasks done",
    "tasks.empty": "No tasks yet — add one above.",
    "tasks.emptyFiltered": "Nothing matches this filter.",
    "tasks.noCategory": "No subject",
    "tasks.startHint": "Click to start the timer with this time budget",
    "tasks.checkDone": "Mark as done",
    "tasks.checkOpen": "Mark as open",
    "tasks.edit": "Edit",
    "tasks.delete": "Delete",
    "tasks.spent": "studied: {time}",
    "tasks.alreadyDone": "This task is already done.",
    "tasks.noneDone": "No completed tasks.",
    "tasks.removedDone": "Removed {n} completed task(s).",
    "tasks.titleRequired": "Title must not be empty.",
    "tasks.editTitle": "Edit task",
    "tasks.fieldTitle": "Title",
    "tasks.fieldCategory": "Subject",
    "tasks.fieldMinutes": "Minutes",
    "tasks.fieldPriority": "Priority",
    "tasks.fieldNote": "Note",

    "goals.daily": "Daily goal",
    "goals.weekly": "Weekly goal",
    "goals.mode": "Mode",
    "goals.modeTime": "Study time",
    "goals.modeTasks": "Tasks",
    "goals.modeBoth": "Study time + tasks",
    "goals.minutes": "Minutes",
    "goals.tasks": "Tasks",
    "goals.timeToday": "Study time today",
    "goals.tasksToday": "Tasks today",
    "goals.timeWeek": "Study time this week",
    "goals.tasksWeek": "Tasks this week",
    "goals.streak": "Streak",
    "goals.streakHint": "Consecutive days with the daily goal reached.",
    "goals.streakHintOpen":
      "Consecutive days with the daily goal reached. Today is still short of it.",
    "goals.streakHintDone": "Daily goal reached today — nice!",

    "stats.today": "Today",
    "stats.week": "This week",
    "stats.total": "Total",
    "stats.sessions": "Sessions",
    "stats.last14": "Last 14 days",
    "stats.heatmap": "Study heatmap",
    "stats.less": "less",
    "stats.more": "more",
    "stats.history": "History",
    "stats.exportCsv": "Export CSV",
    "stats.noSessions": "No sessions recorded yet.",
    "stats.sessionDefault": "Study session",
    "stats.stopwatchSession": "Stopwatch session",
    "stats.focusShort": "focus {n}/5",
    "stats.quote": "“{text}”",
    "stats.nothingToExport": "No data to export yet.",
    "stats.exported": "Exported to {path}",
    "stats.exportFailed": "Export failed",
    "stats.csvFile": "study-stats-{date}.csv",
    "stats.csv.date": "Date",
    "stats.csv.start": "Start",
    "stats.csv.end": "End",
    "stats.csv.minutes": "Duration_minutes",
    "stats.csv.mode": "Mode",
    "stats.csv.task": "Task",
    "stats.csv.category": "Subject",
    "stats.csv.focus": "Focus",
    "stats.csv.reflection": "Reflection",

    "settings.appearance": "Appearance",
    "settings.theme": "Theme",
    "settings.themeDark": "Dark",
    "settings.themeLight": "Light",
    "settings.themeSystem": "Follow system",
    "settings.language": "Language",
    "settings.languageSystem": "System language",
    "settings.timer": "Timer",
    "settings.presets": "Presets (minutes, comma separated)",
    "settings.sound": "Chime when time is up",
    "settings.notify": "System notification",
    "settings.reflection": "Ask for a reflection after each session",
    "settings.vault": "Obsidian vault",
    "settings.vaultPlaceholder": "No vault selected",
    "settings.pickFolder": "Choose folder",
    "settings.removeVault": "Remove",
    "settings.tasksFolder": "Folder for tasks",
    "settings.dailyFolder": "Folder for daily notes",
    "settings.syncTasks": "Sync tasks as Markdown",
    "settings.writeDaily": "Write sessions to the daily note",
    "settings.syncNow": "Sync with vault now",
    "settings.pushAll": "Write all tasks to the vault",
    "settings.data": "Data",
    "settings.dataHint": "All tasks, goals and stats are stored locally in:",
    "settings.defaultTasksFolder": "Study tasks",
    "settings.defaultDailyFolder": "Daily notes",

    "vault.none": "No vault selected.",
    "vault.detected": "Vault detected (.obsidian found).",
    "vault.noObsidianDir":
      "Folder found, but no .obsidian directory — using it anyway.",
    "vault.pickFirst": "Choose a vault folder first.",
    "vault.pickFailed": "Folder selection failed",
    "vault.writeError": "Vault write error",
    "vault.deleteError": "Vault delete error",
    "vault.readError": "Could not read the vault",
    "vault.taskError": "Error on “{task}”",
    "vault.pushed": "Wrote {n} task(s) to the vault.",
    "vault.synced": "Vault synced — {imported} new, {adopted} updated.",
    "vault.dailyError": "Could not write the daily note",

    "reflection.title": "Session complete",
    "reflection.summary": "{time} studied.",
    "reflection.summaryTask": "{time} spent on “{task}”.",
    "reflection.question": "What did you learn?",
    "reflection.placeholder": "Optional — goes into the Obsidian daily note",
    "reflection.focusQuestion": "How focused were you?",
    "reflection.markDone": "Mark task as done",
    "reflection.skip": "Skip",
    "reflection.save": "Save",

    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.loadFailed": "Could not load your data",
    "common.saveFailed": "Saving failed",
    "common.startFailed": "Startup failed",
    "common.browserMode":
      "Browser mode: file and Obsidian features need the desktop app.",
    "common.desktopOnly": "Only available in the desktop app ({cmd})",
  },
};

const WEEKDAY_NAMES = {
  de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

export const LANGUAGES = ["de", "en"];

let current = "de";

/** "system" anhand der Browser-/OS-Sprache aufloesen. */
export function resolveLanguage(setting) {
  if (LANGUAGES.includes(setting)) return setting;
  const nav = (navigator.language || "en").toLowerCase();
  return nav.startsWith("de") ? "de" : "en";
}

export function setLanguage(setting) {
  current = resolveLanguage(setting);
  document.documentElement.setAttribute("lang", current);
  return current;
}

export function getLanguage() {
  return current;
}

export function locale() {
  return current === "de" ? "de-DE" : "en-GB";
}

export function weekdays() {
  return WEEKDAY_NAMES[current];
}

/** Übersetzt einen Schlüssel und ersetzt {platzhalter}. */
export function t(key, vars) {
  const table = STRINGS[current] || STRINGS.de;
  let text = table[key];
  if (text === undefined) text = STRINGS.de[key];
  if (text === undefined) return key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    vars[name] === undefined ? match : String(vars[name])
  );
}

/**
 * Setzt alle statischen Texte im DOM.
 *   data-i18n             -> textContent
 *   data-i18n-html        -> innerHTML (fuer Texte mit <strong> o. Ä.)
 *   data-i18n-placeholder -> placeholder
 *   data-i18n-title       -> title
 */
export function applyStatic(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-html]").forEach((node) => {
    node.innerHTML = t(node.dataset.i18nHtml);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  root.querySelectorAll("[data-i18n-title]").forEach((node) => {
    node.title = t(node.dataset.i18nTitle);
  });
}
