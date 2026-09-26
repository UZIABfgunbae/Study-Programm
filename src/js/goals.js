// Tages-/Wochenziele, Fortschrittsbalken und Streak-Berechnung.

import { $, dateKey, startOfWeek, startOfDay, addDays, formatHuman, clamp } from "./util.js";
import { state, saveState } from "./store.js";
import { t } from "./i18n.js";

let dom = {};

export function initGoals() {
  dom = {
    dailyMode: $("#dailyMode"),
    dailyTimeTarget: $("#dailyTimeTarget"),
    dailyTaskTarget: $("#dailyTaskTarget"),
    weeklyMode: $("#weeklyMode"),
    weeklyTimeTarget: $("#weeklyTimeTarget"),
    weeklyTaskTarget: $("#weeklyTaskTarget"),

    // Fokus-Tab
    dailyTimeLabel: $("#dailyTimeLabel"),
    dailyTimeValue: $("#dailyTimeValue"),
    dailyTimeBar: $("#dailyTimeBar"),
    dailyTaskValue: $("#dailyTaskValue"),
    dailyTaskBar: $("#dailyTaskBar"),
    streakBox: $("#streakBox"),

    // Ziele-Tab
    gDailyTimeValue: $("#gDailyTimeValue"),
    gDailyTimeBar: $("#gDailyTimeBar"),
    gDailyTaskValue: $("#gDailyTaskValue"),
    gDailyTaskBar: $("#gDailyTaskBar"),
    gWeekTimeValue: $("#gWeekTimeValue"),
    gWeekTimeBar: $("#gWeekTimeBar"),
    gWeekTaskValue: $("#gWeekTaskValue"),
    gWeekTaskBar: $("#gWeekTaskBar"),
    streakBig: $("#streakBig"),
    streakHint: $("#streakHint"),

    topbarToday: $("#topbarToday"),
  };

  const goals = state.goals;
  dom.dailyMode.value = goals.daily.mode;
  dom.dailyTimeTarget.value = goals.daily.timeMin;
  dom.dailyTaskTarget.value = goals.daily.tasks;
  dom.weeklyMode.value = goals.weekly.mode;
  dom.weeklyTimeTarget.value = goals.weekly.timeMin;
  dom.weeklyTaskTarget.value = goals.weekly.tasks;

  const bind = (input, apply) =>
    input.addEventListener("change", () => {
      apply();
      saveState();
      renderGoals();
    });

  bind(dom.dailyMode, () => (state.goals.daily.mode = dom.dailyMode.value));
  bind(dom.dailyTimeTarget, () => (state.goals.daily.timeMin = clamp(Number(dom.dailyTimeTarget.value) || 60, 5, 1440)));
  bind(dom.dailyTaskTarget, () => (state.goals.daily.tasks = clamp(Number(dom.dailyTaskTarget.value) || 1, 1, 50)));
  bind(dom.weeklyMode, () => (state.goals.weekly.mode = dom.weeklyMode.value));
  bind(dom.weeklyTimeTarget, () => (state.goals.weekly.timeMin = clamp(Number(dom.weeklyTimeTarget.value) || 300, 10, 10080)));
  bind(dom.weeklyTaskTarget, () => (state.goals.weekly.tasks = clamp(Number(dom.weeklyTaskTarget.value) || 5, 1, 300)));

  renderGoals();
}

// ---------------------------------------------------------------- Berechnung

export function secondsOnDay(key) {
  return state.sessions
    .filter((s) => (s.day || dateKey(new Date(s.endedAt))) === key)
    .reduce((sum, s) => sum + s.durationSec, 0);
}

export function tasksDoneOnDay(key) {
  return state.tasks.filter((t) => t.done && t.completedAt && dateKey(new Date(t.completedAt)) === key).length;
}

export function secondsInRange(fromDate, toDate) {
  const from = fromDate.getTime();
  const to = toDate.getTime();
  return state.sessions
    .filter((s) => s.endedAt >= from && s.endedAt < to)
    .reduce((sum, s) => sum + s.durationSec, 0);
}

export function tasksDoneInRange(fromDate, toDate) {
  const from = fromDate.getTime();
  const to = toDate.getTime();
  return state.tasks.filter((t) => t.done && t.completedAt >= from && t.completedAt < to).length;
}

function goalReached(mode, timeOk, tasksOk) {
  if (mode === "time") return timeOk;
  if (mode === "tasks") return tasksOk;
  return timeOk && tasksOk;
}

export function dayGoalReached(key) {
  const goal = state.goals.daily;
  const timeOk = secondsOnDay(key) >= goal.timeMin * 60;
  const tasksOk = tasksDoneOnDay(key) >= goal.tasks;
  return goalReached(goal.mode, timeOk, tasksOk);
}

/** Aufeinanderfolgende Tage mit erreichtem Tagesziel (heute zaehlt nur positiv). */
export function currentStreak() {
  let streak = 0;
  let cursor = startOfDay();
  const today = dateKey(cursor);

  if (dayGoalReached(today)) streak += 1;
  cursor = addDays(cursor, -1);

  for (let i = 0; i < 3650; i++) {
    const key = dateKey(cursor);
    if (!dayGoalReached(key)) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// ---------------------------------------------------------------- Rendering

function setBar(barEl, valueEl, current, target, formatter) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  barEl.style.width = `${pct}%`;
  barEl.classList.toggle("is-complete", target > 0 && current >= target);
  valueEl.textContent = `${formatter(current)} / ${formatter(target)}`;
}

export function renderGoals() {
  const today = dateKey();
  const weekStart = startOfWeek();
  const weekEnd = addDays(weekStart, 7);

  const daySec = secondsOnDay(today);
  const dayTasks = tasksDoneOnDay(today);
  const weekSec = secondsInRange(weekStart, weekEnd);
  const weekTasks = tasksDoneInRange(weekStart, weekEnd);

  const daily = state.goals.daily;
  const weekly = state.goals.weekly;

  const asTime = (sec) => formatHuman(sec);
  const asCount = (n) => String(n);

  setBar(dom.dailyTimeBar, dom.dailyTimeValue, daySec, daily.timeMin * 60, asTime);
  setBar(dom.dailyTaskBar, dom.dailyTaskValue, dayTasks, daily.tasks, asCount);
  setBar(dom.gDailyTimeBar, dom.gDailyTimeValue, daySec, daily.timeMin * 60, asTime);
  setBar(dom.gDailyTaskBar, dom.gDailyTaskValue, dayTasks, daily.tasks, asCount);
  setBar(dom.gWeekTimeBar, dom.gWeekTimeValue, weekSec, weekly.timeMin * 60, asTime);
  setBar(dom.gWeekTaskBar, dom.gWeekTaskValue, weekTasks, weekly.tasks, asCount);

  dom.dailyTimeLabel.textContent = t(daily.mode === "tasks" ? "focus.studyTimeInfo" : "focus.studyTime");

  const streak = currentStreak();
  dom.streakBox.innerHTML = t(streak === 1 ? "focus.streakDay" : "focus.streakDays", { n: streak });
  dom.streakBig.textContent = String(streak);
  dom.streakHint.textContent = t(
    dayGoalReached(today) ? "goals.streakHintDone" : "goals.streakHintOpen"
  );

  dom.topbarToday.textContent = t("topbar.today", { time: formatHuman(daySec) });
}
