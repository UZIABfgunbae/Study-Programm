// Zentraler Zustand + Persistenz (data.json via Rust, localStorage im Browser-Fallback).

import { invoke, bus, debounce, uid, dateKey, errorToast } from "./util.js";
import { t } from "./i18n.js";

const DEFAULTS = () => ({
  version: 1,
  settings: {
    theme: "dark",
    language: "system",
    presets: [25, 45, 60],
    sound: true,
    notify: true,
    askReflection: true,
    noiseOn: false,
    noiseVolume: 0.4,
    lastMode: "countdown",
    lastDurationSec: 25 * 60,
    vaultPath: "",
    vaultTasksFolder: "Lernaufgaben",
    vaultDailyFolder: "Tagesnotizen",
    vaultSyncTasks: false,
    vaultWriteDaily: false,
  },
  goals: {
    daily: { mode: "time", timeMin: 180, tasks: 5 },
    weekly: { mode: "time", timeMin: 900, tasks: 25 },
  },
  tasks: [],
  sessions: [],
});

export const state = DEFAULTS();

/** Fehlende Felder aus den Defaults ergaenzen (vorwaertskompatibel). */
function mergeDefaults(target, defaults) {
  for (const [key, value] of Object.entries(defaults)) {
    if (target[key] === undefined || target[key] === null) {
      target[key] = Array.isArray(value) ? [...value] : value && typeof value === "object" ? { ...value } : value;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      mergeDefaults(target[key], value);
    }
  }
  return target;
}

/** true, wenn beim Start noch keine gespeicherten Daten vorlagen. */
export let isFirstRun = false;

export async function loadState() {
  try {
    const loaded = await invoke("load_state");
    isFirstRun = !loaded;
    if (loaded && typeof loaded === "object") {
      Object.assign(state, mergeDefaults(loaded, DEFAULTS()));
      state.tasks = (state.tasks || []).map(normalizeTask);
      state.sessions = (state.sessions || []).filter((s) => s && s.durationSec > 0);
    }
  } catch (err) {
    errorToast(t("common.loadFailed"), err);
  }
  return state;
}

const persist = debounce(async () => {
  try {
    await invoke("save_state", { state: JSON.parse(JSON.stringify(state)) });
  } catch (err) {
    errorToast(t("common.saveFailed"), err);
  }
}, 350);

export function saveState({ immediate = false } = {}) {
  if (immediate) persist.flush();
  else persist();
}

// ------------------------------------------------------------------ Aufgaben

function normalizeTask(task) {
  return {
    id: task.id || uid(),
    title: (task.title || "").trim(),
    category: task.category || "",
    estimateSec: Number(task.estimateSec) > 0 ? Number(task.estimateSec) : 25 * 60,
    done: !!task.done,
    priority: ["none", "important", "urgent", "both"].includes(task.priority) ? task.priority : "none",
    note: task.note || "",
    createdAt: task.createdAt || dateKey(),
    updatedAt: Number(task.updatedAt) || Date.now(),
    completedAt: task.completedAt || null,
    spentSec: Number(task.spentSec) || 0,
    vaultFile: task.vaultFile || null,
    order: Number.isFinite(task.order) ? task.order : Date.now(),
  };
}

export function addTask(partial) {
  const task = normalizeTask({ ...partial, id: uid(), updatedAt: Date.now() });
  state.tasks.push(task);
  saveState();
  bus.emit("tasks-changed", { task, reason: "add" });
  return task;
}

export function updateTask(id, patch, { silent = false } = {}) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return null;
  Object.assign(task, patch, { updatedAt: Date.now() });
  if (patch.done === true && !task.completedAt) task.completedAt = Date.now();
  if (patch.done === false) task.completedAt = null;
  saveState();
  if (!silent) bus.emit("tasks-changed", { task, reason: "update" });
  return task;
}

export function removeTask(id) {
  const index = state.tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;
  const [task] = state.tasks.splice(index, 1);
  saveState();
  bus.emit("tasks-changed", { task, reason: "remove" });
  return task;
}

export function getTask(id) {
  return state.tasks.find((t) => t.id === id) || null;
}

export function categories() {
  const set = new Set();
  state.tasks.forEach((t) => t.category && set.add(t.category));
  return [...set].sort((a, b) => a.localeCompare(b, "de"));
}

// ------------------------------------------------------------------ Sessions

export function addSession(session) {
  const entry = {
    id: uid(),
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationSec: Math.round(session.durationSec),
    mode: session.mode || "countdown",
    taskId: session.taskId || null,
    taskTitle: session.taskTitle || "",
    category: session.category || "",
    focus: 0,
    reflection: "",
    day: dateKey(new Date(session.endedAt)),
  };
  state.sessions.push(entry);
  saveState();
  bus.emit("sessions-changed", entry);
  return entry;
}

export function updateSession(id, patch) {
  const session = state.sessions.find((s) => s.id === id);
  if (!session) return null;
  Object.assign(session, patch);
  saveState();
  bus.emit("sessions-changed", session);
  return session;
}

export const defaults = DEFAULTS;
