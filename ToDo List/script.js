const STORAGE_KEY = "mini_todos_v1";

// ? States
let todos = []; // * {id, text, done}
let filter = "all";

// ? Elements
const input = document.getElementById("todo-input");
const addBtn = document.getElementById("add-btn");
const list = document.getElementById("todo-list");
const countEl = document.getElementById("count");
const filters = document.querySelectorAll(".filter");
const clearBtn = document.getElementById("clearCompleted");

// ? init
load();
render();

// ? Events

// * When user press the "add-btn"
addBtn.addEventListener("click", onAdd);

// * When user wants to add new task
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") onAdd();
});

// * When user wants to do some actions with input task
list.addEventListener("click", onListClick);

// * When user wants to add edit the input task
list.addEventListener("dblclick", onEditStart);

// * Filter the tasks list
filters.forEach((f) => f.addEventListener("click", onFilter));

// * When user press "clear-btn" i.e. clear all completed tasks from the list
clearBtn.addEventListener("click", onClearCompleted);

// ? helpers

// * Save the tasks to local storage so that they won't lose on page refresh
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

// * Load the saved tasks from local storage on page refresh/load
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    todos = raw ? JSON.parse(raw) : [];
  } catch (e) {
    todos = [];
  }
}

// * Save and reload the todo list
function reload() {
  save();
  render();
}

// * Generates UId for tasks
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// * Add a new task to the list
function onAdd() {
  const text = input.value.trim();

  if (!text) return input.focus();

  todos.unshift({ id: uid(), text, done: false });
  input.value = "";

  reload();
}

// * Do some actions to the task
function onListClick(e) {
  const target = e.target;
  const itemEl = target.closest(".item");
  if (!itemEl) return;
  const id = itemEl.dataset.id;

  // ? Toggle check
  if (target.classList.contains("check") || target.closest(".check")) {
    toggleDone(id);
    return;
  }

  // ? Delete
  if (target.dataset.action === "delete") {
    removeTodo(id);
    return;
  }

  // ? Edit save
  if (target.dataset.action === "save") {
    const inputEl = itemEl.querySelector(".edit-input");
    finishEdit(id, inputEl.value.trim());
    return;
  }

  // ? Cancel edit
  if (target.dataset.action === "cancel") {
    cancelEdit(itemEl);
    return;
  }
}

// * Mark the selected task as done
function toggleDone(id) {
  todos = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));

  reload();
}

// * Allow user to edit the selected task
function onEditStart(e) {
  const itemEl = e.target.closest(".item");
  if (!itemEl) return;
  startEdit(itemEl.dataset.id, itemEl);
}

// * Start editing the selected task
function startEdit(id, itemEl) {
  const todo = todos.find((t) => t.id === id);

  if (!todo) return;

  // ? Replace content with input
  itemEl.classList.add("editing");
  itemEl.innerHTML = `
        <div style="flex:1">
          <input class="edit-input" value="${escapeHtml(
            todo.text
          )}" style="width:100%; padding:8px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.04); background:transparent; color:inherit;" />
        </div>
        <div class="actions">
          <button class="icon-btn" data-action="save">💾</button>
          <button class="icon-btn" data-action="cancel">✖</button>
        </div>
      `;
  const editInput = itemEl.querySelector(".edit-input");
  editInput.focus();
  editInput.setSelectionRange(editInput.value.length, editInput.value.length);

  // ? Keyboard: Enter to save, Esc to cancel
  editInput.addEventListener("keydown", function handler(ev) {
    // * Save the edited task
    if (ev.key === "Enter") {
      finishEdit(id, editInput.value.trim());
      editInput.removeEventListener("keydown", handler);
    }

    // * Discard changes to the task and exit from edit mode
    if (ev.key === "Escape") {
      cancelEdit(itemEl);
      editInput.removeEventListener("keydown", handler);
    }
  });
}

// * Save the changes to the selected task in edit mode
function finishEdit(id, newText) {
  // ? If the task is empty then remove it
  if (!newText) {
    removeTodo(id);
    return;
  }

  todos = todos.map((t) => (t.id === id ? { ...t, text: newText } : t));
  reload();
}

// * Quit from edit mode
function cancelEdit(itemEl) {
  render(); // simple: re-render to original
}

// * Apply filters to the task list
function onFilter(e) {
  filters.forEach((f) => f.classList.remove("active"));
  e.currentTarget.classList.add("active");

  filter = e.currentTarget.dataset.filter;
  render();
}

// * Filter: Display only completed tasks
function onClearCompleted() {
  todos = todos.filter((t) => !t.done);
  reload();
}

// * Render the tasks list
function render() {
  // ? Applying filters
  let visible = todos;
  if (filter === "active") visible = todos.filter((t) => !t.done);
  if (filter === "completed") visible = todos.filter((t) => t.done);

  // ? Building inner html
  list.innerHTML = visible
    .map(
      (t) => `
        <div class="item fade ${t.done ? "completed" : ""}" data-id="${t.id}">
          <div class="check" role="button" aria-label="${
            t.done ? "Mark as active" : "Mark as done"
          }">
            ${t.done ? "✓" : ""}
          </div>
          <div class="text" title="${escapeHtml(t.text)}">${escapeHtml(
        t.text
      )}</div>
          <div class="actions" aria-hidden="true">
            <button class="icon-btn" title="Edit (double click)">✏️</button>
            <button class="icon-btn" data-action="delete" title="Delete">🗑️</button>
          </div>
        </div>
      `
    )
    .join("");

  // ? Count active tasks from the list
  const remaining = todos.filter((t) => !t.done).length;
  countEl.textContent = `${remaining} item${remaining !== 1 ? "s" : ""}`;

  // ? If the tasks list is empty then show placeholder
  if (todos.length === 0) {
    list.innerHTML = `<div style="padding:20px; color:var(--muted); text-align:center">No todos yet — add something!</div>`;
  }
}

// * Small helper to escape html (prevent injection)
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
