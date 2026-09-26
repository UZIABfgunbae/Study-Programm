// Statistik: Kennzahlen, 14-Tage-Balken, Heatmap, Verlauf, CSV-Export.

import {
  $, el, invoke, dateKey, startOfDay, startOfWeek, addDays, formatHuman,
  shortDate, timeHM, toast, errorToast,
} from "./util.js";
import { t, weekdays } from "./i18n.js";
import { state } from "./store.js";
import { secondsOnDay, dayGoalReached } from "./goals.js";

const HEATMAP_WEEKS = 53;

let dom = {};

export function initStats() {
  dom = {
    today: $("#statToday"),
    week: $("#statWeek"),
    total: $("#statTotal"),
    sessions: $("#statSessions"),
    barChart: $("#barChart"),
    heatmap: $("#heatmap"),
    sessionList: $("#sessionList"),
    exportBtn: $("#btnExportCsv"),
  };
  dom.exportBtn.addEventListener("click", exportCsv);
  renderStats();
}

export function renderStats() {
  renderSummary();
  renderBarChart();
  renderHeatmap();
  renderSessionList();
}

function renderSummary() {
  const today = dateKey();
  const weekStart = startOfWeek().getTime();
  const todaySec = secondsOnDay(today);
  const weekSec = state.sessions.filter((s) => s.endedAt >= weekStart).reduce((a, s) => a + s.durationSec, 0);
  const totalSec = state.sessions.reduce((a, s) => a + s.durationSec, 0);

  dom.today.textContent = formatHuman(todaySec);
  dom.week.textContent = formatHuman(weekSec);
  dom.total.textContent = formatHuman(totalSec);
  dom.sessions.textContent = String(state.sessions.length);
}

function renderBarChart() {
  dom.barChart.replaceChildren();
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const date = addDays(startOfDay(), -i);
    days.push({ date, key: dateKey(date), seconds: secondsOnDay(dateKey(date)) });
  }
  const max = Math.max(60, ...days.map((d) => d.seconds));

  days.forEach((day) => {
    const col = el("div", "col");
    const fill = el("div", "fill");
    fill.style.height = `${Math.max(2, (day.seconds / max) * 100)}%`;
    if (dayGoalReached(day.key)) fill.classList.add("goal-met");
    col.title = `${day.key}: ${formatHuman(day.seconds)}`;
    col.appendChild(fill);
    col.appendChild(el("div", "lbl", shortDate(day.date)));
    dom.barChart.appendChild(col);
  });
}

function level(seconds) {
  if (seconds <= 0) return 0;
  const min = seconds / 60;
  if (min < 30) return 1;
  if (min < 60) return 2;
  if (min < 120) return 3;
  return 4;
}

function renderHeatmap() {
  dom.heatmap.replaceChildren();
  const today = startOfDay();
  // Montag der Woche vor 52 Wochen als Startpunkt.
  const start = addDays(startOfWeek(today), -(HEATMAP_WEEKS - 1) * 7);

  for (let week = 0; week < HEATMAP_WEEKS; week++) {
    for (let day = 0; day < 7; day++) {
      const date = addDays(start, week * 7 + day);
      const cell = el("i", "heat");
      if (date > today) {
        cell.classList.add("is-empty");
      } else {
        const key = dateKey(date);
        const seconds = secondsOnDay(key);
        cell.classList.add(`l${level(seconds)}`);
        cell.title = `${weekdays()[day]} ${key} — ${formatHuman(seconds)}`;
      }
      dom.heatmap.appendChild(cell);
    }
  }
}

function renderSessionList() {
  dom.sessionList.replaceChildren();
  const list = [...state.sessions].sort((a, b) => b.endedAt - a.endedAt).slice(0, 120);
  if (!list.length) {
    dom.sessionList.appendChild(el("div", "empty-state", t("stats.noSessions")));
    return;
  }
  list.forEach((session) => {
    const item = el("div", "session-item");
    const main = el("div", "s-main");
    main.appendChild(
      el(
        "div",
        "s-title",
        session.taskTitle ||
          t(session.mode === "stopwatch" ? "stats.stopwatchSession" : "stats.sessionDefault")
      )
    );
    const meta = [`${session.day || dateKey(new Date(session.endedAt))}`, `${timeHM(session.startedAt)}–${timeHM(session.endedAt)}`];
    if (session.category) meta.push(session.category);
    if (session.focus) meta.push(t("stats.focusShort", { n: session.focus }));
    main.appendChild(el("div", "s-meta", meta.join(" · ")));
    if (session.reflection) main.appendChild(el("div", "s-meta", t("stats.quote", { text: session.reflection })));
    item.appendChild(main);
    item.appendChild(el("div", "s-dur", formatHuman(session.durationSec)));
    dom.sessionList.appendChild(item);
  });
}

// ------------------------------------------------------------- CSV-Export

function csvCell(value) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

export function buildCsv() {
  const header = [
    t("stats.csv.date"),
    t("stats.csv.start"),
    t("stats.csv.end"),
    t("stats.csv.minutes"),
    t("stats.csv.mode"),
    t("stats.csv.task"),
    t("stats.csv.category"),
    t("stats.csv.focus"),
    t("stats.csv.reflection"),
  ];
  const rows = [...state.sessions]
    .sort((a, b) => a.endedAt - b.endedAt)
    .map((s) => [
      s.day || dateKey(new Date(s.endedAt)),
      timeHM(s.startedAt),
      timeHM(s.endedAt),
      Math.round(s.durationSec / 60),
      t(s.mode === "stopwatch" ? "timer.stopwatch" : "timer.countdown"),
      s.taskTitle || "",
      s.category || "",
      s.focus || "",
      (s.reflection || "").replace(/\r?\n/g, " "),
    ]);
  // BOM, damit Excel UTF-8 erkennt; Semikolon als Trenner (deutsches Excel).
  return "﻿" + [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n") + "\r\n";
}

async function exportCsv() {
  if (!state.sessions.length) {
    toast(t("stats.nothingToExport"));
    return;
  }
  try {
    const path = await invoke("export_text_file", {
      defaultName: t("stats.csvFile", { date: dateKey() }),
      contents: buildCsv(),
    });
    if (path) toast(t("stats.exported", { path }), "ok");
  } catch (err) {
    errorToast(t("stats.exportFailed"), err);
  }
}
