<p align="center"><b>🇬🇧 English</b> &nbsp;·&nbsp; <a href="README.de.md">🇩🇪 Deutsch</a></p>

<h1 align="center">Study Focus</h1>

<p align="center">
  A calm desktop app for focused studying — timer, tasks with time budgets,
  goals, brown noise and real Obsidian integration.<br>
  Runs natively on <b>Windows 11</b> and <b>Kali Linux / Debian</b> — in English and German.
</p>

<p align="center">
  <img alt="Tauri 2" src="https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri&logoColor=white">
  <img alt="Rust" src="https://img.shields.io/badge/Rust-1.77%2B-CE422B?logo=rust&logoColor=white">
  <img alt="Frontend" src="https://img.shields.io/badge/Frontend-Vanilla%20JS-F7DF1E?logo=javascript&logoColor=black">
  <img alt="No Node" src="https://img.shields.io/badge/Node.js-not%20required-5FA04E?logo=nodedotjs&logoColor=white">
  <img alt="Platforms" src="https://img.shields.io/badge/Platform-Windows%20%7C%20Linux-informational">
  <img alt="Languages" src="https://img.shields.io/badge/UI-English%20%7C%20Deutsch-blue">
</p>

<table>
  <tr>
    <td width="50%"><img alt="Focus view in English" src="docs/screenshot-en.png"></td>
    <td width="50%"><img alt="Fokus-Ansicht auf Deutsch" src="docs/screenshot-de.png"></td>
  </tr>
  <tr>
    <td align="center"><sub>English</sub></td>
    <td align="center"><sub>Deutsch</sub></td>
  </tr>
</table>

---

## Why

Most study timers are either web pages you forget the moment you switch tabs, or apps that
push your data into their cloud. Study Focus is a native desktop app, keeps everything local
— and writes your study sessions where your knowledge already lives: **in your Obsidian vault**.

## Features

### ⏱ Timer
- **Countdown** and **stopwatch**, freely configurable in hours / minutes / seconds
- Presets for a quick start (25 / 45 / 60 min, editable in the settings)
- Start, pause, reset — timestamp-based, so it stays accurate across system sleep
- A chime (generated triad) **and** a system notification when time is up,
  even while the window is minimized
- **Remaining time in the window title and the taskbar**
- Shortcuts: `Space` = start/pause · `R` = reset · `Esc` = close dialog

### ✅ Tasks with time budgets
- Create, edit, delete, tick off — every task carries an estimated duration
- **Clicking a task starts the timer with exactly that time budget**
- Subjects / categories for grouping, priorities (*important* / *urgent*) with colour marks
- A short note field per task (`#tags` and `[[wikilinks]]` welcome)
- Progress line “X of Y tasks done” and filters by subject / status

### 🎯 Goals
- Daily **and** weekly goal, each as study time, number of tasks, or both
- Progress bars in the focus view and in the goals tab
- **Streak counter** for consecutive days with the daily goal reached

### 🗒 Obsidian integration
- Vault selection through the **native folder dialog** (no browser upload)
- Tasks as Markdown files with YAML front matter (`tags`, `created`, `time_required`, `done`, …)
- Obsidian checkboxes `- [ ]` / `- [x]` — **ticked in Obsidian means done in the app**
- After every session an entry is appended to the **daily note** (date as the file name,
  study time, completed tasks, reflection), including the accumulated `study_minutes`
- Two-way sync: read on startup and on demand, written on every change
- Your own front matter fields are preserved

### 🎧 Brown noise
- Deliberately **brown noise instead of white noise** — deeper, softer, less tiring
- Generated entirely in the browser (no audio files in the repo), seamless loop
- On/off switch and volume slider, keeps running independently of the timer chime

### 💭 Session reflection
- After each completed run, optionally: “What did you learn?” and focus 1–5
- Mark the related task as done right inside the dialog
- Everything ends up in the Obsidian daily note

### 📊 Stats
- Key figures for today, this week and all time
- Bar chart of the last 14 days (days that hit the goal are highlighted)
- **Heatmap across 53 weeks** in the style of the GitHub contribution graph
- History of all sessions and **CSV export** (semicolon + BOM, opens cleanly in Excel)

### 🌍 Bilingual
- Complete interface in **English and German**, switchable without a restart
- Defaults to the system language, but can be pinned to either one
- The vault output follows the language too: `## Study sessions` / `## Lernsessions`,
  `priority: important` / `priority: wichtig`
- Existing notes stay readable after a language switch — the app writes in the selected
  language and **reads both**

### 🎨 Interface
- Clear separation between *current focus* (timer + running task) and list / stats
- Dark, light or follow the system
- Responsive down to ~360 px window width, honours `prefers-reduced-motion`

---

## Installation

### Prebuilt packages

No releases published yet — until then you can build the app yourself in a few minutes.

### Build it yourself — prerequisites

<details open>
<summary><b>Windows 11</b></summary>

```powershell
winget install Rustlang.Rustup
winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

WebView2 ships with Windows 11 already.

For building the installers you also need the Tauri CLI:

```powershell
cargo install tauri-cli --version "^2.0"
```

> **Windows on ARM (Snapdragon):** the CLI pulls in a dependency that needs `clang`.
> Run `winget install LLVM.LLVM` first, otherwise the build fails with
> `failed to find tool "clang"`. Just **running** the app does not need the CLI.

</details>

<details open>
<summary><b>Kali Linux / Debian / Ubuntu</b></summary>

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
cargo install tauri-cli --version "^2.0"
```

For AppImage builds also install `sudo apt install libfuse2`.

</details>

### Running

Without the Tauri CLI — entirely sufficient for development and testing:

```bash
cd src-tauri
cargo run
```

With the CLI, from the project root:

```bash
cargo tauri dev
```

The first build takes a few minutes, after that the app starts in seconds.
**Changes under `src/` need no recompilation** — reloading the window with `F5` is enough.

### Building a release

```bash
cargo tauri build
```

| System | Output |
|---|---|
| Windows | `src-tauri/target/release/bundle/msi/Study Focus_0.1.0_x64_en-US.msi` |
| Windows | `src-tauri/target/release/bundle/nsis/Study Focus_0.1.0_x64-setup.exe` |
| Linux | `src-tauri/target/release/bundle/deb/study-focus_0.1.0_amd64.deb` |
| Linux | `src-tauri/target/release/bundle/appimage/study-focus_0.1.0_amd64.AppImage` |

The architecture in the file name follows the build machine (`x64` or `arm64`).
Tauri does not support cross-compiling from Windows to Linux — build the `.deb`
directly on the Linux machine from the same source folder:

```bash
sudo dpkg -i src-tauri/target/release/bundle/deb/study-focus_0.1.0_amd64.deb
sudo apt -f install   # if dependencies are missing
```

---

## Setting up the Obsidian integration

*Settings → Obsidian vault → **Choose folder***, then enable
*Sync tasks as Markdown* and/or *Write sessions to the daily note*.
The target folders (default: `Study tasks` and `Daily notes`) are yours to choose and get
created on demand.

### What a task looks like in the vault

```markdown
---
title: Work through calculus chapter 3
tags: [study-task, Maths, important]
created: 2026-09-26
time_required: 45min
estimate_seconds: 2700
done: false
priority: important
category: Maths
app_id: muinxloes7p6gu
---
# Work through calculus chapter 3

- [ ] Work through calculus chapter 3 #Maths  (~45 min)

## Note

Focus on limits, see [[Calculus notes]]
```

### What a daily note looks like

```markdown
---
tags: [daily-note, study]
date: 2026-09-26
study_minutes: 70
sessions: 2
---
# 2026-09-26

## Study sessions
- **19:05 - 19:30** (25 min) -- [[Work through calculus chapter 3]] #Maths -- Focus: 4/5
    - Learned: revisited the limit theorems
    - Completed: [[Work through calculus chapter 3]]
```

### Language inside the vault

The labels in the Markdown files follow the selected language:

| | English | Deutsch |
|---|---|---|
| Task tag | `#study-task` | `#lernaufgabe` |
| Note heading | `## Note` | `## Notiz` |
| Session section | `## Study sessions` | `## Lernsessions` |
| Total in the daily note | `study_minutes` | `lernzeit_minuten` |
| Priority | `important` / `urgent` | `wichtig` / `dringend` |

The front matter keys (`title`, `created`, `time_required`, `estimate_seconds`, `done`,
`priority`, `category`, `app_id`) are identical in both languages. When reading, the app
understands both variants, so switching languages loses neither completed tasks nor the
accumulated study time of an existing daily note.

### Conflict rule

Last writer wins — the file timestamp in the vault is compared against the app's internal
modification time. In practice: tasks ticked off in Obsidian, plus titles, notes and time
budgets changed there, are picked up on the next sync; new Markdown files in the task folder
are imported as tasks.

---

## Where the data lives

Everything is stored locally, independently of the vault:

| System | Path |
|---|---|
| Windows | `%APPDATA%\de.lernfokus.study-focus\data.json` |
| Linux | `~/.local/share/de.lernfokus.study-focus/data.json` |

Writes are atomic (`.tmp` first, then rename), and a damaged file is moved aside rather than
deleted. The app works completely **without** an Obsidian vault.

---

## Project layout

```
Study-App/
├─ src/                    Frontend — shipped as-is, no bundler
│  ├─ index.html
│  ├─ styles.css
│  └─ js/
│     ├─ app.js            Entry point, views, settings, shortcuts
│     ├─ timer.js          Timer core (timestamp-based)
│     ├─ tasks.js          Task list + edit dialog
│     ├─ goals.js          Goals, progress, streak
│     ├─ stats.js          Stats, heatmap, CSV
│     ├─ vault.js          Obsidian synchronisation
│     ├─ audio.js          Brown noise + chime (Web Audio)
│     ├─ store.js          State + persistence
│     ├─ i18n.js           English / German translations
│     └─ util.js           Helpers, Tauri bridge, browser fallback
└─ src-tauri/              Rust backend
   ├─ src/lib.rs           Tauri commands
   ├─ src/storage.rs       data.json, atomic writes (+ tests)
   ├─ src/obsidian.rs      Markdown read/write, daily notes (+ tests)
   ├─ tauri.conf.json      Window, CSP, bundle targets
   ├─ capabilities/        Tauri ACL
   └─ icons/               App icons
```

**A deliberate choice: no Node.js, no bundler.** The frontend is plain ES modules that Tauri
serves directly via `frontendDist: "../src"`. Fewer dependencies, faster builds, no
`node_modules`.

---

## Development

### Previewing the frontend without Rust

```bash
cd src
python -m http.server 8777
```

Then open <http://127.0.0.1:8777>. In this browser mode the app stores state in
`localStorage`; the folder dialog, Obsidian access and system notifications stay exclusive to
the desktop app — the app points that out on startup.

### Tests

The Obsidian logic is covered by Rust tests — front matter round-trip, adopting a checkbox
ticked in Obsidian, preserving custom front matter fields, accumulating totals in the daily
note, sanitising file names, plus the English output and a language switch in the middle of a
daily note. Parsing `data.json` (including a UTF-8 BOM) is covered too:

```bash
cd src-tauri
cargo test --lib
```

### Publishing on GitHub

```bash
git init
git add .
git commit -m "Study Focus: first version"
git branch -M main
git remote add origin https://github.com/<your-name>/study-focus.git
git push -u origin main
```

`src-tauri/target/` is already excluded via `.gitignore`.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `link.exe not found` | MSVC build tools missing (see prerequisites) |
| `failed to find tool "clang"` during `cargo install tauri-cli` | Windows on ARM: `winget install LLVM.LLVM` |
| `webkit2gtk` not found | On Debian/Kali install `libwebkit2gtk-4.1-dev` |
| Window stays blank | Check the console output; as a last resort set `"csp": null` under `app.security` in `src-tauri/tauri.conf.json` |
| No notifications (Windows) | Settings → System → Notifications: allow “Study Focus” |
| No notifications (Kali) | Install a notification daemon: `sudo apt install libnotify-bin dunst` |
| No sound | The audio context only starts after the first click or key press inside the window |

---

## Roadmap

- [ ] Pomodoro automation (alternating study and break blocks)
- [ ] Tray icon with remaining time and quick controls
- [ ] Global shortcuts (control the timer without focusing the window)
- [ ] Watch the Obsidian folder live instead of syncing on startup
- [ ] More languages (all translations live in `src/js/i18n.js`)
- [ ] Signed releases for Windows and Linux

## License

No license chosen yet. For a public repository **MIT** is the obvious choice — all it takes
is a `LICENSE` file in the project root.
