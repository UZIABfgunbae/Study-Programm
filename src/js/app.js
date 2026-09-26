// Einstiegspunkt: verdrahtet Views, Einstellungen, Tastenkürzel und Module.

import { $, $$, invoke, bus, toast, errorToast, formatHuman, hasTauri } from "./util.js";
import { state, loadState, saveState, updateSession, updateTask, getTask, isFirstRun } from "./store.js";
import { t, setLanguage, applyStatic } from "./i18n.js";
import { initTimer, toggle, reset, renderPresets, renderCurrentTask, getTimerState, clearTask, render as renderTimer } from "./timer.js";
import { initTasks, renderTasks, isEditOpen, closeEdit } from "./tasks.js";
import { initGoals, renderGoals } from "./goals.js";
import { initStats, renderStats } from "./stats.js";
import * as vault from "./vault.js";
import { startNoise, stopNoise, setNoiseVolume, unlockAudio } from "./audio.js";

// ------------------------------------------------------------------- Theme

const media = window.matchMedia("(prefers-color-scheme: light)");

function applyTheme(theme) {
  const resolved = theme === "system" ? (media.matches ? "light" : "dark") : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}

media.addEventListener("change", () => {
  if (state.settings.theme === "system") applyTheme("system");
});

// ----------------------------------------------------------------- Sprache

/**
 * Setzt die Sprache und zeichnet alle Ansichten neu — statische Texte über
 * die data-i18n-Attribute, dynamische über die Render-Funktionen der Module.
 */
export function applyLanguage() {
  setLanguage(state.settings.language || "system");
  applyStatic();
  renderPresets();
  renderTimer();
  renderCurrentTask();
  renderTasks();
  renderGoals();
  renderStats();
  refreshVaultStatus();
}

// -------------------------------------------------------------------- Views

function initViews() {
  $("#tabs").addEventListener("click", (event) => {
    const tab = event.target.closest(".tab");
    if (!tab) return;
    showView(tab.dataset.view);
  });
}

function showView(name) {
  $$(".tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === name));
  $$(".view").forEach((view) => view.classList.toggle("is-active", view.dataset.view === name));
  if (name === "stats") renderStats();
  if (name === "goals") renderGoals();
}

// --------------------------------------------------------------- Reflexion

let pendingSession = null;
let pendingFocus = 0;

/** Wird in initSettings() gesetzt — der Vault-Status hängt an der Sprache. */
let refreshVaultStatus = async () => {};

function initReflection() {
  const modal = $("#reflectionModal");

  $("#focusScale").addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-focus]");
    if (!btn) return;
    pendingFocus = Number(btn.dataset.focus);
    $$("#focusScale button").forEach((b) => b.classList.toggle("is-active", b === btn));
  });

  $("#reflectionSave").addEventListener("click", () => {
    if (!pendingSession) return closeReflection();
    const text = $("#reflectionText").value.trim();
    updateSession(pendingSession.id, { reflection: text, focus: pendingFocus });

    const completed = [];
    if ($("#reflectionTaskDone").checked && pendingSession.taskId) {
      const task = getTask(pendingSession.taskId);
      if (task && !task.done) {
        updateTask(task.id, { done: true });
        completed.push(task.title);
      }
    }
    finalizeSession({ ...pendingSession, reflection: text, focus: pendingFocus }, completed);
    closeReflection();
  });

  $("#reflectionSkip").addEventListener("click", () => {
    if (pendingSession) finalizeSession(pendingSession, []);
    closeReflection();
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      if (pendingSession) finalizeSession(pendingSession, []);
      closeReflection();
    }
  });
}

function openReflection(session) {
  pendingSession = session;
  pendingFocus = 0;
  $("#reflectionSummary").textContent = session.taskTitle
    ? t("reflection.summaryTask", { time: formatHuman(session.durationSec), task: session.taskTitle })
    : t("reflection.summary", { time: formatHuman(session.durationSec) });
  $("#reflectionText").value = "";
  $$("#focusScale button").forEach((b) => b.classList.remove("is-active"));

  const task = session.taskId ? getTask(session.taskId) : null;
  const row = $("#reflectionTaskRow");
  row.hidden = !task || task.done;
  $("#reflectionTaskDone").checked = false;

  $("#reflectionModal").hidden = false;
  $("#reflectionText").focus();
}

function closeReflection() {
  $("#reflectionModal").hidden = true;
  pendingSession = null;
  pendingFocus = 0;
}

function isReflectionOpen() {
  return !$("#reflectionModal").hidden;
}

/** Session ist endgültig: Tagesnotiz schreiben und Ansichten auffrischen. */
async function finalizeSession(session, completedTitles) {
  await vault.writeDailyEntry(session, completedTitles);
  renderGoals();
  renderStats();
  renderTasks();
  renderCurrentTask();
}

// -------------------------------------------------------------- Fokus-Sound

function initNoise() {
  const toggleInput = $("#noiseToggle");
  const volume = $("#noiseVolume");
  const volumeLabel = $("#noiseVolumeValue");

  toggleInput.checked = !!state.settings.noiseOn;
  volume.value = Math.round((state.settings.noiseVolume ?? 0.4) * 100);
  volumeLabel.textContent = `${volume.value} %`;

  toggleInput.addEventListener("change", () => {
    state.settings.noiseOn = toggleInput.checked;
    saveState();
    if (toggleInput.checked) startNoise(Number(volume.value) / 100);
    else stopNoise();
  });

  volume.addEventListener("input", () => {
    const value = Number(volume.value) / 100;
    volumeLabel.textContent = `${volume.value} %`;
    state.settings.noiseVolume = value;
    setNoiseVolume(value);
    saveState();
  });

  // Browser erlauben Audio erst nach einer Nutzeraktion.
  const resume = () => {
    unlockAudio();
    if (state.settings.noiseOn) startNoise(Number(volume.value) / 100);
    window.removeEventListener("pointerdown", resume);
    window.removeEventListener("keydown", resume);
  };
  window.addEventListener("pointerdown", resume, { once: false });
  window.addEventListener("keydown", resume, { once: false });
}

// ------------------------------------------------------------ Einstellungen

function initSettings() {
  const themeSelect = $("#themeSelect");
  themeSelect.value = state.settings.theme;
  themeSelect.addEventListener("change", () => {
    state.settings.theme = themeSelect.value;
    applyTheme(themeSelect.value);
    saveState();
  });

  $("#themeToggle").addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    state.settings.theme = next;
    themeSelect.value = next;
    applyTheme(next);
    saveState();
  });

  const languageSelect = $("#languageSelect");
  languageSelect.value = state.settings.language || "system";
  languageSelect.addEventListener("change", () => {
    state.settings.language = languageSelect.value;
    saveState();
    applyLanguage();
  });

  const presetInput = $("#presetInput");
  presetInput.value = (state.settings.presets || []).join(", ");
  presetInput.addEventListener("change", () => {
    const values = presetInput.value
      .split(/[,;\s]+/)
      .map((v) => parseInt(v, 10))
      .filter((v) => Number.isFinite(v) && v > 0 && v <= 600)
      .slice(0, 8);
    state.settings.presets = values.length ? values : [25, 45, 60];
    presetInput.value = state.settings.presets.join(", ");
    saveState();
    renderPresets();
  });

  const bindToggle = (selector, key) => {
    const input = $(selector);
    input.checked = !!state.settings[key];
    input.addEventListener("change", () => {
      state.settings[key] = input.checked;
      saveState();
    });
    return input;
  };

  bindToggle("#soundToggle", "sound");
  bindToggle("#notifyToggle", "notify");
  bindToggle("#reflectionToggle", "askReflection");

  // ------------------------------------------------------------ Vault-UI
  const vaultPath = $("#vaultPath");
  const status = $("#vaultStatus");
  const tasksFolder = $("#vaultTasksFolder");
  const dailyFolder = $("#vaultDailyFolder");
  const syncToggle = $("#vaultSyncTasks");
  const dailyToggle = $("#vaultWriteDaily");

  vaultPath.value = state.settings.vaultPath || "";
  tasksFolder.value = state.settings.vaultTasksFolder;
  dailyFolder.value = state.settings.vaultDailyFolder;
  syncToggle.checked = !!state.settings.vaultSyncTasks;
  dailyToggle.checked = !!state.settings.vaultWriteDaily;

  refreshVaultStatus = async function () {
    const path = state.settings.vaultPath;
    if (!path) {
      status.textContent = t("vault.none");
      status.className = "vault-status";
      return;
    }
    try {
      const isObsidian = await vault.checkVault(path);
      status.textContent = t(isObsidian ? "vault.detected" : "vault.noObsidianDir");
      status.className = `vault-status ${isObsidian ? "ok" : "warn"}`;
    } catch (err) {
      status.textContent = String(err && err.message ? err.message : err);
      status.className = "vault-status err";
    }
  };

  $("#btnPickVault").addEventListener("click", async () => {
    try {
      const picked = await vault.pickVault();
      if (!picked) return;
      vaultPath.value = picked;
      await refreshVaultStatus();
      if (state.settings.vaultSyncTasks) await vault.syncTasks();
    } catch (err) {
      errorToast(t("vault.pickFailed"), err);
    }
  });

  $("#btnClearVault").addEventListener("click", () => {
    state.settings.vaultPath = "";
    vaultPath.value = "";
    saveState();
    refreshVaultStatus();
  });

  tasksFolder.addEventListener("change", () => {
    state.settings.vaultTasksFolder = tasksFolder.value.trim() || t("settings.defaultTasksFolder");
    tasksFolder.value = state.settings.vaultTasksFolder;
    saveState();
  });

  dailyFolder.addEventListener("change", () => {
    state.settings.vaultDailyFolder = dailyFolder.value.trim() || t("settings.defaultDailyFolder");
    dailyFolder.value = state.settings.vaultDailyFolder;
    saveState();
  });

  syncToggle.addEventListener("change", async () => {
    state.settings.vaultSyncTasks = syncToggle.checked;
    saveState();
    if (syncToggle.checked) {
      if (!vault.vaultConfigured()) {
        toast(t("vault.pickFirst"), "err");
        return;
      }
      await vault.syncTasks();
    }
  });

  dailyToggle.addEventListener("change", () => {
    state.settings.vaultWriteDaily = dailyToggle.checked;
    saveState();
  });

  $("#btnVaultSync").addEventListener("click", () => vault.syncTasks());
  $("#btnVaultPushAll").addEventListener("click", () => vault.pushAllTasks());

  refreshVaultStatus();

  invoke("data_file_path")
    .then((path) => ($("#dataPath").textContent = path))
    .catch(() => ($("#dataPath").textContent = "—"));
}

// ------------------------------------------------------------ Tastenkürzel

function initShortcuts() {
  window.addEventListener("keydown", (event) => {
    const tag = (event.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select" || event.target.isContentEditable;

    if (event.key === "Escape") {
      if (isEditOpen()) closeEdit();
      else if (isReflectionOpen()) {
        if (pendingSession) finalizeSession(pendingSession, []);
        closeReflection();
      }
      return;
    }

    if (typing || isEditOpen() || isReflectionOpen()) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    if (event.code === "Space") {
      event.preventDefault();
      toggle();
    } else if (event.key === "r" || event.key === "R") {
      event.preventDefault();
      reset({ record: true });
    }
  });
}

// ------------------------------------------------------------ Aktuelle Aufgabe

function initCurrentTaskActions() {
  $("#btnTaskDone").addEventListener("click", () => {
    const id = getTimerState().taskId;
    if (!id) return;
    const task = getTask(id);
    if (!task) return;
    updateTask(id, { done: !task.done });
    toast(t(task.done ? "focus.markedOpen" : "focus.markedDone"), "ok");
  });

  $("#btnTaskClear").addEventListener("click", () => clearTask());
}

// ------------------------------------------------------------------- Start

async function main() {
  await loadState();
  setLanguage(state.settings.language || "system");
  applyTheme(state.settings.theme);

  // Beim allerersten Start die Vault-Ordner in der Anzeigesprache benennen.
  if (isFirstRun) {
    state.settings.vaultTasksFolder = t("settings.defaultTasksFolder");
    state.settings.vaultDailyFolder = t("settings.defaultDailyFolder");
  }
  applyStatic();

  initViews();
  initTimer();
  initTasks();
  initGoals();
  initStats();
  initSettings();
  initNoise();
  initReflection();
  initShortcuts();
  initCurrentTaskActions();
  renderCurrentTask();

  // Zentrale Aktualisierung nach Datenänderungen.
  bus.on("tasks-changed", async ({ task, reason }) => {
    renderTasks();
    renderCurrentTask();
    renderGoals();
    renderTimer();
    if (reason === "remove") await vault.deleteTaskFile(task);
    else await vault.pushTask(task);
  });

  bus.on("tasks-refreshed", () => {
    renderTasks();
    renderCurrentTask();
    renderGoals();
  });

  bus.on("sessions-changed", () => {
    renderGoals();
    renderStats();
  });

  bus.on("timer-changed", () => {
    renderTasks();
  });

  bus.on("task-selected", () => {
    renderTasks();
  });

  bus.on("session-finished", ({ session, needsReflection }) => {
    if (needsReflection && state.settings.askReflection) openReflection(session);
    else finalizeSession(session, []);
  });

  // Beim Start einmal mit dem Vault abgleichen.
  if (vault.vaultConfigured() && state.settings.vaultSyncTasks) {
    vault.syncTasks({ quiet: true }).catch((err) => console.warn("Vault-Sync", err));
  }

  if (!hasTauri) {
    toast(t("common.browserMode"), "err");
  }

  window.addEventListener("beforeunload", () => saveState({ immediate: true }));
}

main().catch((err) => errorToast(t("common.startFailed"), err));
