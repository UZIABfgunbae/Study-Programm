// Aufgabenliste: Formular, Liste, Filter, Bearbeiten-Dialog, Fortschritt.

import { $, el, formatHuman, toast, clamp } from "./util.js";
import { state, addTask, updateTask, removeTask, getTask, categories } from "./store.js";
import { startWithTask, getTimerState, renderCurrentTask } from "./timer.js";
import { t } from "./i18n.js";

const PRIORITY_RANK = { both: 0, urgent: 1, important: 2, none: 3 };

let dom = {};
let editingId = null;

export function initTasks() {
  dom = {
    form: $("#taskForm"),
    title: $("#newTitle"),
    category: $("#newCategory"),
    estimate: $("#newEstimate"),
    priority: $("#newPriority"),
    note: $("#newNote"),
    list: $("#taskList"),
    filterCategory: $("#filterCategory"),
    filterStatus: $("#filterStatus"),
    clearDone: $("#btnClearDone"),
    progressText: $("#taskProgressText"),
    progressBar: $("#taskProgressBar"),
    categoryList: $("#categoryList"),
    modal: $("#editModal"),
    editTitle: $("#editTitle"),
    editCategory: $("#editCategory"),
    editEstimate: $("#editEstimate"),
    editPriority: $("#editPriority"),
    editNote: $("#editNote"),
    editSave: $("#editSave"),
    editCancel: $("#editCancel"),
  };

  dom.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = dom.title.value.trim();
    if (!title) return;
    addTask({
      title,
      category: dom.category.value.trim(),
      estimateSec: clamp(Number(dom.estimate.value) || 25, 1, 600) * 60,
      priority: dom.priority.value,
      note: dom.note.value.trim(),
    });
    dom.title.value = "";
    dom.note.value = "";
    dom.title.focus();
  });

  dom.filterCategory.addEventListener("change", renderTasks);
  dom.filterStatus.addEventListener("change", renderTasks);

  dom.clearDone.addEventListener("click", () => {
    const done = state.tasks.filter((t) => t.done);
    if (!done.length) {
      toast(t("tasks.noneDone"));
      return;
    }
    done.forEach((task) => removeTask(task.id));
    toast(t("tasks.removedDone", { n: done.length }), "ok");
  });

  dom.editSave.addEventListener("click", saveEdit);
  dom.editCancel.addEventListener("click", closeEdit);
  dom.modal.addEventListener("click", (event) => {
    if (event.target === dom.modal) closeEdit();
  });

  renderTasks();
}

// --------------------------------------------------------------- Rendering

export function renderTasks() {
  refreshCategoryOptions();

  const statusFilter = dom.filterStatus.value;
  const categoryFilter = dom.filterCategory.value;

  let list = [...state.tasks];
  if (categoryFilter) list = list.filter((t) => (t.category || "") === categoryFilter);
  if (statusFilter === "open") list = list.filter((t) => !t.done);
  if (statusFilter === "done") list = list.filter((t) => t.done);

  list.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pr !== 0) return pr;
    return (a.order || 0) - (b.order || 0);
  });

  dom.list.replaceChildren();

  if (!list.length) {
    dom.list.appendChild(
      el("div", "empty-state", t(state.tasks.length ? "tasks.emptyFiltered" : "tasks.empty"))
    );
  } else if (!categoryFilter) {
    const groups = new Map();
    list.forEach((task) => {
      const key = task.category || t("tasks.noCategory");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(task);
    });
    const sortedKeys = [...groups.keys()].sort((a, b) => a.localeCompare(b, "de"));
    const single = sortedKeys.length === 1;
    sortedKeys.forEach((key) => {
      if (!single) dom.list.appendChild(el("div", "task-group-title", key));
      groups.get(key).forEach((task) => dom.list.appendChild(taskRow(task)));
    });
  } else {
    list.forEach((task) => dom.list.appendChild(taskRow(task)));
  }

  const total = state.tasks.length;
  const done = state.tasks.filter((t) => t.done).length;
  dom.progressText.textContent = t("tasks.progress", { done, total });
  const pct = total ? (done / total) * 100 : 0;
  dom.progressBar.style.width = `${pct}%`;
  dom.progressBar.classList.toggle("is-complete", total > 0 && done === total);
}

function taskRow(task) {
  const row = el("div", "task-item");
  row.classList.add(`prio-${task.priority}`);
  if (task.done) row.classList.add("is-done");
  if (getTimerState().taskId === task.id) row.classList.add("is-active");

  const check = el("input", "task-check");
  check.type = "checkbox";
  check.checked = task.done;
  check.title = t(task.done ? "tasks.checkOpen" : "tasks.checkDone");
  check.addEventListener("change", () => {
    updateTask(task.id, { done: check.checked });
  });
  row.appendChild(check);

  const main = el("div", "task-main");
  main.title = t("tasks.startHint");
  main.appendChild(el("div", "task-title", task.title));

  const meta = el("div", "task-meta");
  if (task.category) meta.appendChild(el("span", "chip", task.category));
  meta.appendChild(el("span", "chip", formatHuman(task.estimateSec)));
  if (task.priority !== "none") {
    const chip = el(
      "span",
      `chip prio${task.priority === "urgent" || task.priority === "both" ? " urgent" : ""}`,
      t(`tasks.prio.${task.priority}`)
    );
    meta.appendChild(chip);
  }
  if (task.spentSec > 0) meta.appendChild(el("span", "", t("tasks.spent", { time: formatHuman(task.spentSec) })));
  main.appendChild(meta);

  if (task.note) main.appendChild(el("div", "task-note", task.note));

  main.addEventListener("click", () => {
    if (task.done) {
      toast(t("tasks.alreadyDone"));
      return;
    }
    startWithTask(task);
    document.querySelector('.tab[data-view="focus"]').click();
  });
  row.appendChild(main);

  const actions = el("div", "task-actions");
  const edit = el("button", "edit", "✎");
  edit.title = t("tasks.edit");
  edit.addEventListener("click", (event) => {
    event.stopPropagation();
    openEdit(task.id);
  });
  const del = el("button", "del", "✕");
  del.title = t("tasks.delete");
  del.addEventListener("click", (event) => {
    event.stopPropagation();
    if (getTimerState().taskId === task.id) {
      getTimerState().taskId = null;
      renderCurrentTask();
    }
    removeTask(task.id);
  });
  actions.append(edit, del);
  row.appendChild(actions);

  return row;
}

export function refreshCategoryOptions() {
  const cats = categories();

  const current = dom.filterCategory.value;
  dom.filterCategory.replaceChildren(new Option(t("tasks.allCategories"), ""));
  cats.forEach((cat) => dom.filterCategory.appendChild(new Option(cat, cat)));
  dom.filterCategory.value = cats.includes(current) ? current : "";

  dom.categoryList.replaceChildren();
  cats.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    dom.categoryList.appendChild(option);
  });
}

// ------------------------------------------------------------ Bearbeiten

export function openEdit(id) {
  const task = getTask(id);
  if (!task) return;
  editingId = id;
  dom.editTitle.value = task.title;
  dom.editCategory.value = task.category || "";
  dom.editEstimate.value = Math.round(task.estimateSec / 60);
  dom.editPriority.value = task.priority;
  dom.editNote.value = task.note || "";
  dom.modal.hidden = false;
  dom.editTitle.focus();
}

function saveEdit() {
  if (!editingId) return;
  const title = dom.editTitle.value.trim();
  if (!title) {
    toast(t("tasks.titleRequired"), "err");
    return;
  }
  updateTask(editingId, {
    title,
    category: dom.editCategory.value.trim(),
    estimateSec: clamp(Number(dom.editEstimate.value) || 25, 1, 600) * 60,
    priority: dom.editPriority.value,
    note: dom.editNote.value.trim(),
  });
  closeEdit();
}

export function closeEdit() {
  dom.modal.hidden = true;
  editingId = null;
}

export function isEditOpen() {
  return !dom.modal.hidden;
}
