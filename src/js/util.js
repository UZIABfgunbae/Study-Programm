// Kleine Helfer: Tauri-Bruecke, DOM, Zeitformate, Event-Bus, Toasts.

import { t } from "./i18n.js";

const TAURI = window.__TAURI__;
export const hasTauri = !!(TAURI && TAURI.core && TAURI.core.invoke);

/**
 * Ruft ein Rust-Kommando auf. Laeuft die Seite ohne Tauri (z. B. direkt im
 * Browser geoeffnet), greift ein Fallback, damit die Oberflaeche trotzdem
 * bedienbar bleibt.
 */
export async function invoke(cmd, args = {}) {
  if (hasTauri) return TAURI.core.invoke(cmd, args);
  return browserFallback(cmd, args);
}

const LS_KEY = "study-focus-state";

async function browserFallback(cmd, args) {
  switch (cmd) {
    case "load_state": {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    }
    case "save_state":
      localStorage.setItem(LS_KEY, JSON.stringify(args.state));
      return null;
    case "data_file_path":
      return "localStorage (Browser)";
    case "set_window_title":
      document.title = args.title;
      return null;
    case "focus_window":
      return null;
    case "notify":
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(args.title, { body: args.body });
      }
      return null;
    default:
      throw new Error(t("common.desktopOnly", { cmd }));
  }
}

// ------------------------------------------------------------------- DOM

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ------------------------------------------------------------- Event-Bus

const listeners = new Map();

export const bus = {
  on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
  },
  emit(event, payload) {
    const set = listeners.get(event);
    if (set) set.forEach((fn) => fn(payload));
  },
};

// ------------------------------------------------------------------ Zeit

export function pad(n) {
  return String(n).padStart(2, "0");
}

/** Sekunden -> "H:MM:SS" oder "MM:SS" */
export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** Sekunden -> "2 h 15 min" / "45 min" */
export function formatHuman(totalSeconds) {
  if (totalSeconds > 0 && totalSeconds < 60) return `${Math.round(totalSeconds)} s`;
  const min = Math.round(totalSeconds / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

/** Date -> "YYYY-MM-DD" in lokaler Zeit (nicht UTC!) */
export function dateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function timeHM(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Montag 00:00 der Woche, in der `date` liegt. */
export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Montag = 0
  d.setDate(d.getDate() - day);
  return d;
}

export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function shortDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

// ---------------------------------------------------------------- Toasts

export function toast(message, kind = "") {
  const wrap = document.getElementById("toastWrap");
  if (!wrap) return;
  const node = el("div", `toast ${kind}`.trim(), message);
  wrap.appendChild(node);
  setTimeout(() => {
    node.style.opacity = "0";
    node.style.transition = "opacity .25s";
    setTimeout(() => node.remove(), 260);
  }, 3600);
}

export function errorToast(prefix, error) {
  const msg = error && error.message ? error.message : String(error);
  toast(`${prefix}: ${msg}`, "err");
  console.error(prefix, error);
}

// --------------------------------------------------------------- Diverses

export function debounce(fn, wait) {
  let handle = null;
  const wrapped = (...args) => {
    clearTimeout(handle);
    handle = setTimeout(() => fn(...args), wait);
  };
  wrapped.flush = (...args) => {
    clearTimeout(handle);
    fn(...args);
  };
  return wrapped;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
