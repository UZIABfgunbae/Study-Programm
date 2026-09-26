// Timer-Kern: Countdown + Stoppuhr, zeitstempel-basiert (driftet nicht).

import { $, $$, el, invoke, bus, formatClock, formatHuman, clamp, toast } from "./util.js";
import { state, saveState, addSession, updateTask, getTask } from "./store.js";
import { playChime, unlockAudio } from "./audio.js";
import { t } from "./i18n.js";

const RING_CIRCUMFERENCE = 2 * Math.PI * 104; // r = 104 im SVG

const timer = {
  mode: "countdown",
  durationSec: 25 * 60,
  running: false,
  startedWall: 0, // Date.now() beim letzten Start
  accumMs: 0, // Zeit vor dem letzten Start
  sessionStart: null, // Beginn der gesamten Session
  taskId: null,
  ticker: null,
  lastTitleSec: -1,
};

let dom = {};

export function getTimerState() {
  return timer;
}

export function initTimer() {
  dom = {
    display: $("#timerDisplay"),
    sub: $("#timerSub"),
    ring: $("#ringProgress"),
    ringWrap: $(".timer-ring-wrap"),
    hours: $("#inpHours"),
    minutes: $("#inpMinutes"),
    seconds: $("#inpSeconds"),
    timeInputs: $("#timeInputs"),
    presets: $("#presets"),
    startPause: $("#btnStartPause"),
    reset: $("#btnReset"),
    finish: $("#btnFinish"),
    modeSwitch: $("#modeSwitch"),
    currentTask: $("#currentTaskBox"),
    currentTaskActions: $("#currentTaskActions"),
  };

  dom.ring.style.strokeDasharray = String(RING_CIRCUMFERENCE);

  timer.mode = state.settings.lastMode === "stopwatch" ? "stopwatch" : "countdown";
  timer.durationSec = clamp(Number(state.settings.lastDurationSec) || 1500, 1, 24 * 3600);
  applyModeToUi();
  writeInputs(timer.durationSec);

  dom.startPause.addEventListener("click", toggle);
  dom.reset.addEventListener("click", () => reset({ record: true }));
  dom.finish.addEventListener("click", () => finishStopwatch());

  dom.modeSwitch.addEventListener("click", (event) => {
    const btn = event.target.closest(".mode-btn");
    if (!btn) return;
    setMode(btn.dataset.mode);
  });

  [dom.hours, dom.minutes, dom.seconds].forEach((input) => {
    input.addEventListener("change", () => {
      if (timer.running) return;
      const secs = readInputs();
      timer.durationSec = secs;
      state.settings.lastDurationSec = secs;
      saveState();
      render();
    });
  });

  renderPresets();
  render();
}

// ------------------------------------------------------------------ Presets

export function renderPresets() {
  const list = Array.isArray(state.settings.presets) ? state.settings.presets : [25, 45, 60];
  dom.presets.replaceChildren();
  list.forEach((minutes) => {
    const btn = el("button", "preset-btn", t("timer.presetMinutes", { n: minutes }));
    btn.type = "button";
    btn.addEventListener("click", () => {
      setDuration(minutes * 60);
      if (timer.mode !== "countdown") setMode("countdown");
    });
    dom.presets.appendChild(btn);
  });
}

// ------------------------------------------------------------------- Eingabe

function readInputs() {
  const h = clamp(Number(dom.hours.value) || 0, 0, 23);
  const m = clamp(Number(dom.minutes.value) || 0, 0, 59);
  const s = clamp(Number(dom.seconds.value) || 0, 0, 59);
  return Math.max(1, h * 3600 + m * 60 + s);
}

function writeInputs(totalSec) {
  dom.hours.value = Math.floor(totalSec / 3600);
  dom.minutes.value = Math.floor((totalSec % 3600) / 60);
  dom.seconds.value = totalSec % 60;
}

export function setDuration(seconds) {
  timer.durationSec = clamp(Math.round(seconds), 1, 24 * 3600);
  state.settings.lastDurationSec = timer.durationSec;
  saveState();
  if (!timer.running) {
    timer.accumMs = 0;
    writeInputs(timer.durationSec);
  }
  render();
}

export function setMode(mode) {
  if (mode !== "countdown" && mode !== "stopwatch") return;
  if (timer.running) {
    toast(t("timer.stillRunning"));
    return;
  }
  timer.mode = mode;
  timer.accumMs = 0;
  timer.sessionStart = null;
  state.settings.lastMode = mode;
  saveState();
  applyModeToUi();
  render();
}

function applyModeToUi() {
  $$(".mode-btn", dom.modeSwitch).forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.mode === timer.mode);
  });
  const isCountdown = timer.mode === "countdown";
  dom.timeInputs.hidden = !isCountdown;
  dom.presets.hidden = !isCountdown;
  dom.finish.hidden = isCountdown;
}

// -------------------------------------------------------------- Steuerung

function elapsedMs() {
  return timer.accumMs + (timer.running ? Date.now() - timer.startedWall : 0);
}

export function toggle() {
  unlockAudio();
  if (timer.running) pause();
  else start();
}

export function start() {
  if (timer.running) return;
  if (timer.mode === "countdown") {
    if (timer.accumMs === 0) timer.durationSec = readInputs();
    if (timer.durationSec <= 0) return;
  }
  timer.running = true;
  timer.startedWall = Date.now();
  if (!timer.sessionStart) timer.sessionStart = Date.now();
  dom.startPause.textContent = t("timer.pause");
  dom.timeInputs.querySelectorAll("input").forEach((i) => (i.disabled = true));
  if (!timer.ticker) timer.ticker = setInterval(tick, 200);
  render();
  bus.emit("timer-changed", timer);
}

export function pause() {
  if (!timer.running) return;
  timer.accumMs = elapsedMs();
  timer.running = false;
  dom.startPause.textContent = t("timer.resume");
  render();
  bus.emit("timer-changed", timer);
}

/**
 * Setzt den Timer zurueck. Bereits gelernte Zeit (>= 1 Minute) wird als
 * Teil-Session gespeichert, damit nichts verloren geht.
 */
export function reset({ record = true } = {}) {
  const spentSec = Math.floor(elapsedMs() / 1000);
  const hadSession = timer.sessionStart !== null;
  stopTicker();
  timer.running = false;
  timer.accumMs = 0;
  const started = timer.sessionStart;
  timer.sessionStart = null;
  dom.startPause.textContent = t("timer.start");
  dom.timeInputs.querySelectorAll("input").forEach((i) => (i.disabled = false));

  if (record && hadSession && spentSec >= 60) {
    const session = storeSession(started, spentSec);
    toast(t("timer.partialSaved", { time: formatHuman(spentSec) }), "ok");
    bus.emit("session-finished", { session, needsReflection: false });
  }

  if (timer.mode === "countdown") writeInputs(timer.durationSec);
  render();
  bus.emit("timer-changed", timer);
}

function finishStopwatch() {
  const spentSec = Math.floor(elapsedMs() / 1000);
  if (spentSec < 5) {
    toast(t("timer.tooShort"));
    return;
  }
  const started = timer.sessionStart || Date.now() - spentSec * 1000;
  stopTicker();
  timer.running = false;
  timer.accumMs = 0;
  timer.sessionStart = null;
  dom.startPause.textContent = t("timer.start");
  const session = storeSession(started, spentSec);
  render();
  bus.emit("timer-changed", timer);
  bus.emit("session-finished", { session, needsReflection: true });
}

function stopTicker() {
  if (timer.ticker) {
    clearInterval(timer.ticker);
    timer.ticker = null;
  }
  setWindowTitle(null);
}

function tick() {
  if (!timer.running) {
    stopTicker();
    return;
  }
  if (timer.mode === "countdown" && elapsedMs() >= timer.durationSec * 1000) {
    complete();
    return;
  }
  render();
}

function complete() {
  const spentSec = timer.durationSec;
  const started = timer.sessionStart || Date.now() - spentSec * 1000;
  stopTicker();
  timer.running = false;
  timer.accumMs = 0;
  timer.sessionStart = null;
  dom.startPause.textContent = t("timer.start");
  dom.timeInputs.querySelectorAll("input").forEach((i) => (i.disabled = false));
  writeInputs(timer.durationSec);
  render();

  const session = storeSession(started, spentSec);

  if (state.settings.sound) {
    try {
      playChime();
    } catch (err) {
      console.warn("Signalton nicht abspielbar", err);
    }
  }
  if (state.settings.notify) {
    const task = timer.taskId ? getTask(timer.taskId) : null;
    invoke("notify", {
      title: t("timer.doneTitle"),
      body: task
        ? t("timer.doneBodyTask", { task: task.title, time: formatHuman(spentSec) })
        : t("timer.doneBody", { time: formatHuman(spentSec) }),
    }).catch((err) => console.warn("notify failed", err));
  }

  bus.emit("timer-changed", timer);
  bus.emit("session-finished", { session, needsReflection: true });
}

function storeSession(startedAt, durationSec) {
  const task = timer.taskId ? getTask(timer.taskId) : null;
  const session = addSession({
    startedAt: startedAt || Date.now() - durationSec * 1000,
    endedAt: Date.now(),
    durationSec,
    mode: timer.mode,
    taskId: task ? task.id : null,
    taskTitle: task ? task.title : "",
    category: task ? task.category : "",
  });
  if (task) {
    updateTask(task.id, { spentSec: (task.spentSec || 0) + durationSec }, { silent: true });
  }
  return session;
}

// ------------------------------------------------------------ Aufgabenbezug

export function startWithTask(task) {
  if (timer.running) {
    toast(t("timer.alreadyRunning"));
    return;
  }
  timer.taskId = task.id;
  timer.accumMs = 0;
  timer.sessionStart = null;
  if (timer.mode === "countdown") {
    setDuration(task.estimateSec);
  }
  renderCurrentTask();
  start();
  bus.emit("task-selected", task);
}

export function selectTask(task) {
  timer.taskId = task ? task.id : null;
  if (task && timer.mode === "countdown" && !timer.running && timer.accumMs === 0) {
    setDuration(task.estimateSec);
  }
  renderCurrentTask();
  bus.emit("task-selected", task);
}

export function clearTask() {
  timer.taskId = null;
  renderCurrentTask();
  bus.emit("task-selected", null);
}

export function renderCurrentTask() {
  const task = timer.taskId ? getTask(timer.taskId) : null;
  const box = dom.currentTask;
  if (!box) return;
  if (!task) {
    box.classList.add("empty");
    box.innerHTML = t("focus.noTask");
    dom.currentTaskActions.hidden = true;
    return;
  }
  box.classList.remove("empty");
  box.replaceChildren();
  box.appendChild(el("div", "ct-title", task.title));
  const meta = [];
  if (task.category) meta.push(task.category);
  meta.push(t("focus.taskPlanned", { time: formatHuman(task.estimateSec) }));
  if (task.spentSec) meta.push(t("focus.taskSpent", { time: formatHuman(task.spentSec) }));
  if (task.done) meta.push(t("focus.taskIsDone"));
  box.appendChild(el("div", "ct-meta", meta.join(" · ")));
  if (task.note) box.appendChild(el("div", "ct-note", task.note));
  dom.currentTaskActions.hidden = false;
}

// ---------------------------------------------------------------- Rendering

function setWindowTitle(text) {
  const title = text ? `${text} · ${t("app.name")}` : t("app.name");
  invoke("set_window_title", { title }).catch(() => {});
  document.title = title;
}

export function render() {
  const elapsedSec = Math.floor(elapsedMs() / 1000);
  let displaySec;
  let fraction;

  if (timer.mode === "countdown") {
    displaySec = Math.max(0, timer.durationSec - elapsedSec);
    fraction = timer.durationSec > 0 ? displaySec / timer.durationSec : 0;
  } else {
    displaySec = elapsedSec;
    fraction = (elapsedSec % 60) / 60;
  }

  dom.startPause.textContent = t(
    timer.running ? "timer.pause" : timer.accumMs > 0 ? "timer.resume" : "timer.start"
  );
  dom.display.textContent = formatClock(displaySec);
  dom.ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - fraction));
  dom.ringWrap.classList.toggle("is-over", timer.mode === "stopwatch");

  const task = timer.taskId ? getTask(timer.taskId) : null;
  if (timer.running) {
    dom.sub.textContent = task
      ? task.title
      : t(timer.mode === "countdown" ? "timer.running" : "timer.stopwatchRunning");
  } else if (timer.accumMs > 0) {
    dom.sub.textContent = t("timer.paused");
  } else {
    dom.sub.textContent = task ? task.title : t("timer.ready");
  }

  // Fenstertitel nur bei Sekundenwechsel aktualisieren.
  if (timer.running && displaySec !== timer.lastTitleSec) {
    timer.lastTitleSec = displaySec;
    setWindowTitle(formatClock(displaySec));
  } else if (!timer.running && timer.lastTitleSec !== -1) {
    timer.lastTitleSec = -1;
    setWindowTitle(null);
  }
}
