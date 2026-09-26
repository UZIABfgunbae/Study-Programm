# Beschreibung & Tags zum Kopieren

Sammlung aller Texte, die GitHub, Paketmanager und App-Verzeichnisse abfragen.

---

## 1. Repo-Beschreibung („About", max. 350 Zeichen)

**Deutsch — empfohlen:**

```
Lern-Fokus-App für Windows & Linux: Timer, Aufgaben mit Zeitvorgabe, Ziele, Brown Noise und echte Obsidian-Integration. Alles lokal, keine Cloud. Tauri 2 + Vanilla JS, ohne Node.
```

**Englisch — falls du international sichtbar sein willst:**

```
Distraction-free study app for Windows & Linux: timer, tasks with time budgets, goals, brown noise and real Obsidian sync. Local-first, no cloud. Tauri 2 + vanilla JS, no Node.
```

**Ultrakurz (Tagline, z. B. für die Social Preview oder die Repo-Website):**

```
Lernen mit Timer, Zielen und Obsidian — lokal und ohne Ablenkung.
```

---

## 2. GitHub-Topics (Tags)

GitHub erlaubt max. 20 Topics, nur Kleinbuchstaben, Ziffern und Bindestriche.

### Kernset (die 10 wichtigsten — wenn du sparsam sein willst)

```
tauri  rust  desktop-app  study-timer  focus-timer  pomodoro  obsidian  productivity  local-first  vanilla-javascript
```

### Vollset (20 Topics, direkt einfügbar)

```
tauri
tauri-app
rust
desktop-app
vanilla-javascript
study-timer
focus-timer
pomodoro-timer
productivity
time-management
task-manager
goal-tracking
obsidian
obsidian-md
markdown
brown-noise
local-first
offline-first
windows
linux
```

### Per CLI setzen (sobald das Repo existiert)

```bash
gh repo edit --description "Lern-Fokus-App für Windows & Linux: Timer, Aufgaben mit Zeitvorgabe, Ziele, Brown Noise und echte Obsidian-Integration. Alles lokal, keine Cloud. Tauri 2 + Vanilla JS, ohne Node."
gh repo edit --add-topic tauri,tauri-app,rust,desktop-app,vanilla-javascript,study-timer,focus-timer,pomodoro-timer,productivity,time-management,task-manager,goal-tracking,obsidian,obsidian-md,markdown,brown-noise,local-first,offline-first,windows,linux
```

---

## 3. Mittellange Beschreibung (Release-Notes, Verzeichnisse, Forenposts)

```
Study Focus ist eine schlanke Desktop-App für konzentriertes Lernen. Sie verbindet einen
frei einstellbaren Timer (Countdown und Stoppuhr) mit einer Aufgabenliste, in der jede
Aufgabe eine geschätzte Dauer hat — ein Klick startet den Timer direkt damit. Tages- und
Wochenziele, ein Streak-Zähler und eine Heatmap über 53 Wochen zeigen, wie viel wirklich
zusammenkommt.

Das Besondere ist die Obsidian-Anbindung: Aufgaben werden als Markdown-Dateien mit
YAML-Frontmatter und Checkboxen im Vault abgelegt, und nach jeder Lernsession schreibt die
App automatisch einen Eintrag in die Tagesnotiz — inklusive Lernzeit, erledigter Aufgaben
und einer kurzen Reflexion. In Obsidian abgehakte Aufgaben gelten auch in der App als
erledigt.

Dazu kommen Brown Noise als Fokus-Sound, System-Benachrichtigungen, Restzeit in der
Taskleiste, CSV-Export und ein ruhiges Design in Hell und Dunkel. Alle Daten bleiben lokal
auf dem Rechner, es gibt kein Konto und keine Cloud.
```

---

## 4. Kurzbeschreibung für Paket-Metadaten

Steht bereits in `src-tauri/tauri.conf.json` (`bundle.shortDescription` /
`bundle.longDescription`) und in `src-tauri/Cargo.toml` (`description`) — landet damit in
MSI, NSIS-Installer und `.deb`.

**shortDescription:**

```
Lern-Fokus-App mit Timer, Zielen und Obsidian-Integration
```

**longDescription:**

```
Study Focus verbindet einen frei einstellbaren Lern-Timer mit einer Aufgabenliste samt
Zeitvorgaben, Tages- und Wochenzielen, Brown Noise als Fokus-Sound und einer Statistik mit
Heatmap. Lernsessions und Aufgaben lassen sich als Markdown in einen Obsidian-Vault
schreiben. Alle Daten bleiben lokal.
```

---

## 5. Hashtags für Social Media

```
#Obsidian #ObsidianMD #Tauri #RustLang #Produktivität #Lernen #StudyWithMe #OpenSource #LocalFirst #Pomodoro
```
