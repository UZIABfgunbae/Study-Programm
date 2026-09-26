// Obsidian-Anbindung: Aufgaben <-> Markdown-Dateien, Sessions -> Tagesnotiz.

import { invoke, bus, toast, errorToast, dateKey, timeHM, uid } from "./util.js";
import { state, saveState, getTask } from "./store.js";
import { t, getLanguage } from "./i18n.js";

export function vaultConfigured() {
  return !!(state.settings.vaultPath || "").trim();
}

function paths() {
  return {
    vault: state.settings.vaultPath,
    tasks: state.settings.vaultTasksFolder || "Lernaufgaben",
    daily: state.settings.vaultDailyFolder || "Tagesnotizen",
  };
}

export async function pickVault() {
  const picked = await invoke("pick_folder", { title: t("settings.vault") });
  if (!picked) return null;
  state.settings.vaultPath = picked;
  saveState();
  return picked;
}

export async function checkVault(path) {
  return invoke("vault_check", { vault: path });
}

// ------------------------------------------------------- Aufgaben schreiben

function toPayload(task) {
  return {
    id: task.id,
    title: task.title,
    category: task.category || "",
    estimateSec: task.estimateSec,
    done: !!task.done,
    priority: task.priority || "none",
    note: task.note || "",
    created: task.createdAt || dateKey(),
    file: task.vaultFile || null,
  };
}

export async function pushTask(task) {
  if (!vaultConfigured() || !state.settings.vaultSyncTasks) return;
  try {
    const { vault, tasks } = paths();
    const file = await invoke("vault_write_task", {
      vault,
      folder: tasks,
      task: toPayload(task),
      lang: getLanguage(),
    });
    if (file && task.vaultFile !== file) {
      task.vaultFile = file;
      saveState();
    }
  } catch (err) {
    errorToast(t("vault.writeError"), err);
  }
}

export async function pushAllTasks() {
  if (!vaultConfigured()) {
    toast(t("vault.none"), "err");
    return;
  }
  const { vault, tasks } = paths();
  let count = 0;
  for (const task of state.tasks) {
    try {
      const file = await invoke("vault_write_task", {
        vault,
        folder: tasks,
        task: toPayload(task),
        lang: getLanguage(),
      });
      if (file) task.vaultFile = file;
      count += 1;
    } catch (err) {
      errorToast(t("vault.taskError", { task: task.title }), err);
      break;
    }
  }
  saveState();
  toast(t("vault.pushed", { n: count }), "ok");
}

export async function deleteTaskFile(task) {
  if (!vaultConfigured() || !state.settings.vaultSyncTasks || !task.vaultFile) return;
  try {
    const { vault, tasks } = paths();
    await invoke("vault_delete_task", { vault, folder: tasks, file: task.vaultFile });
  } catch (err) {
    errorToast(t("vault.deleteError"), err);
  }
}

// ---------------------------------------------------------- Aufgaben lesen

/**
 * Gleicht den Aufgaben-Ordner des Vaults mit der lokalen Liste ab.
 * Wer zuletzt geschrieben hat, gewinnt (Datei-mtime vs. updatedAt).
 */
export async function syncTasks({ quiet = false } = {}) {
  if (!vaultConfigured() || !state.settings.vaultSyncTasks) return;
  const { vault, tasks: folder } = paths();

  let vaultTasks;
  try {
    vaultTasks = await invoke("vault_scan_tasks", { vault, folder });
  } catch (err) {
    errorToast(t("vault.readError"), err);
    return;
  }

  const seenFiles = new Set();
  const toPush = [];
  let imported = 0;
  let adopted = 0;

  for (const vt of vaultTasks) {
    seenFiles.add(vt.file);
    let local =
      (vt.appId && state.tasks.find((t) => t.id === vt.appId)) ||
      state.tasks.find((t) => t.vaultFile === vt.file) ||
      null;

    if (!local) {
      // Neue Datei im Vault -> Aufgabe importieren.
      local = {
        id: vt.appId || uid(),
        title: vt.title,
        category: vt.category || "",
        estimateSec: vt.estimateSec,
        done: vt.done,
        priority: vt.priority || "none",
        note: vt.note || "",
        createdAt: dateKey(),
        updatedAt: vt.mtimeMs,
        completedAt: vt.done ? Date.now() : null,
        spentSec: 0,
        vaultFile: vt.file,
        order: Date.now(),
      };
      state.tasks.push(local);
      imported += 1;
      continue;
    }

    local.vaultFile = vt.file;
    // 2 Sekunden Toleranz: eigene Schreibvorgaenge nicht als Fremdaenderung werten.
    if (vt.mtimeMs > (local.updatedAt || 0) + 2000) {
      const changed =
        local.title !== vt.title ||
        local.done !== vt.done ||
        local.estimateSec !== vt.estimateSec ||
        local.note !== vt.note ||
        local.category !== vt.category ||
        local.priority !== vt.priority;
      if (changed) {
        local.title = vt.title;
        local.category = vt.category || "";
        local.estimateSec = vt.estimateSec;
        local.priority = vt.priority || "none";
        local.note = vt.note || "";
        if (local.done !== vt.done) {
          local.done = vt.done;
          local.completedAt = vt.done ? Date.now() : null;
        }
        local.updatedAt = vt.mtimeMs;
        adopted += 1;
      }
    } else {
      toPush.push(local);
    }
  }

  // Lokale Aufgaben ohne (noch existierende) Datei im Vault anlegen.
  for (const task of state.tasks) {
    if (!task.vaultFile || !seenFiles.has(task.vaultFile)) {
      if (task.vaultFile && !seenFiles.has(task.vaultFile)) task.vaultFile = null;
      toPush.push(task);
    }
  }

  for (const task of new Set(toPush)) {
    try {
      const file = await invoke("vault_write_task", {
        vault,
        folder,
        task: toPayload(task),
        lang: getLanguage(),
      });
      if (file) task.vaultFile = file;
    } catch (err) {
      errorToast(t("vault.taskError", { task: task.title }), err);
      break;
    }
  }

  saveState();
  bus.emit("tasks-refreshed");
  if (!quiet) {
    toast(t("vault.synced", { imported, adopted }), "ok");
  }
}

// ------------------------------------------------------------ Tagesnotizen

export async function writeDailyEntry(session, completedTitles = []) {
  if (!vaultConfigured() || !state.settings.vaultWriteDaily) return;
  const { vault, daily } = paths();
  const task = session.taskId ? getTask(session.taskId) : null;

  const entry = {
    date: dateKey(new Date(session.endedAt)),
    startTime: timeHM(session.startedAt),
    endTime: timeHM(session.endedAt),
    minutes: Math.max(1, Math.round(session.durationSec / 60)),
    taskTitle: session.taskTitle || (task ? task.title : ""),
    category: session.category || (task ? task.category : ""),
    focus: Number(session.focus) || 0,
    reflection: session.reflection || "",
    completedTasks: completedTitles.filter(Boolean),
  };

  try {
    await invoke("vault_append_daily", { vault, folder: daily, entry, lang: getLanguage() });
  } catch (err) {
    errorToast(t("vault.dailyError"), err);
  }
}
