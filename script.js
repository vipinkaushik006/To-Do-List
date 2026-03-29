// ===== State =====
let tasks = [];
let editingId = null;

// ===== DOM References =====
const taskInput     = document.getElementById('taskInput');
const priorityInput = document.getElementById('priorityInput');
const categoryInput = document.getElementById('categoryInput');
const dueDateInput  = document.getElementById('dueDateInput');
const taskListEl    = document.getElementById('taskList');
const searchInput   = document.getElementById('searchInput');
const filterStatus  = document.getElementById('filterStatus');
const filterPriority= document.getElementById('filterPriority');
const statTotal     = document.getElementById('statTotal');
const statDone      = document.getElementById('statDone');
const statPending   = document.getElementById('statPending');
const themeToggle   = document.getElementById('themeToggle');
const modalOverlay  = document.getElementById('modalOverlay');
const editText      = document.getElementById('editText');
const editPriority  = document.getElementById('editPriority');
const editCategory  = document.getElementById('editCategory');
const editDueDate   = document.getElementById('editDueDate');

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  loadTasks();
  render();

  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
  });

  searchInput.addEventListener('input', render);
  filterStatus.addEventListener('change', render);
  filterPriority.addEventListener('change', render);
});

// ===== Theme =====
function loadTheme() {
  const saved = localStorage.getItem('todo-theme') || 'light';
  applyTheme(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('todo-theme', next);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
}

// ===== Local Storage =====
function loadTasks() {
  try {
    tasks = JSON.parse(localStorage.getItem('todo-tasks') || '[]');
  } catch {
    tasks = [];
  }
}

function saveTasks() {
  localStorage.setItem('todo-tasks', JSON.stringify(tasks));
}

// ===== Task Operations =====
function addTask() {
  const text = taskInput.value.trim();
  if (!text) {
    showToast('Please enter a task.', 'error');
    taskInput.focus();
    return;
  }

  const task = {
    id: Date.now(),
    text,
    priority: priorityInput.value,
    category: categoryInput.value.trim(),
    dueDate: dueDateInput.value,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  tasks.unshift(task);
  saveTasks();
  render();
  showToast('Task added!', 'success');

  taskInput.value = '';
  categoryInput.value = '';
  dueDateInput.value = '';
  priorityInput.value = 'medium';
  taskInput.focus();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  render();
}

function deleteTask(id) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (el) {
    el.classList.add('removing');
    setTimeout(() => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      render();
    }, 240);
  } else {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
  }
  showToast('Task deleted.', 'info');
}

// ===== Bulk Actions =====
function markAllComplete() {
  if (tasks.length === 0) return;
  tasks.forEach(t => { t.completed = true; });
  saveTasks();
  render();
  showToast('All tasks marked complete!', 'success');
}

function clearCompleted() {
  const count = tasks.filter(t => t.completed).length;
  if (count === 0) {
    showToast('No completed tasks to clear.', 'info');
    return;
  }
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  render();
  showToast(`Cleared ${count} completed task${count !== 1 ? 's' : ''}.`, 'info');
}

// ===== Edit Modal =====
function openEdit(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  editingId = id;
  editText.value = task.text;
  editPriority.value = task.priority;
  editCategory.value = task.category || '';
  editDueDate.value = task.dueDate || '';
  modalOverlay.classList.add('active');
  editText.focus();
}

function closeModal() {
  modalOverlay.classList.remove('active');
  editingId = null;
}

function saveEdit() {
  const text = editText.value.trim();
  if (!text) {
    showToast('Task text cannot be empty.', 'error');
    return;
  }
  const task = tasks.find(t => t.id === editingId);
  if (!task) return;
  task.text = text;
  task.priority = editPriority.value;
  task.category = editCategory.value.trim();
  task.dueDate = editDueDate.value;
  saveTasks();
  render();
  closeModal();
  showToast('Task updated!', 'success');
}

// Close modal on overlay click
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// Close modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeModal();
});

// ===== Filtering =====
function getFiltered() {
  const q = searchInput.value.toLowerCase().trim();
  const status = filterStatus.value;
  const prio = filterPriority.value;

  return tasks.filter(task => {
    const matchesSearch = !q ||
      task.text.toLowerCase().includes(q) ||
      (task.category && task.category.toLowerCase().includes(q));

    const matchesStatus =
      status === 'all' ||
      (status === 'pending' && !task.completed) ||
      (status === 'completed' && task.completed);

    const matchesPrio = prio === 'all' || task.priority === prio;

    return matchesSearch && matchesStatus && matchesPrio;
  });
}

// ===== Render =====
function render() {
  updateStats();
  const filtered = getFiltered();
  taskListEl.innerHTML = '';

  if (filtered.length === 0) {
    taskListEl.innerHTML = `
      <div class="empty-state" role="status" aria-live="polite">
        <span class="empty-icon">📋</span>
        <p>${tasks.length === 0 ? 'No tasks yet. Add your first task above!' : 'No tasks match your search/filter.'}</p>
      </div>`;
    return;
  }

  filtered.forEach(task => {
    taskListEl.appendChild(createTaskEl(task));
  });
}

function updateStats() {
  const total = tasks.length;
  const done  = tasks.filter(t => t.completed).length;
  statTotal.textContent   = total;
  statDone.textContent    = done;
  statPending.textContent = total - done;
}

function createTaskEl(task) {
  const li = document.createElement('li');
  li.className = `task-item priority-${task.priority}${task.completed ? ' completed' : ''}`;
  li.setAttribute('data-id', task.id);
  li.setAttribute('role', 'listitem');

  const dueBadge = task.dueDate ? buildDueBadge(task.dueDate) : '';
  const catBadge = task.category
    ? `<span class="badge badge-category" aria-label="Category: ${escHtml(task.category)}">🏷️ ${escHtml(task.category)}</span>`
    : '';
  const prioBadge = `<span class="badge badge-priority-${task.priority}" aria-label="Priority: ${task.priority}">
      ${{ low: '🟢', medium: '🟡', high: '🔴' }[task.priority]} ${cap(task.priority)}
    </span>`;

  li.innerHTML = `
    <div class="task-checkbox" role="checkbox" aria-checked="${task.completed}"
         tabindex="0" aria-label="Mark task as ${task.completed ? 'incomplete' : 'complete'}">
      <span class="check-icon" aria-hidden="true">✓</span>
    </div>
    <div class="task-content">
      <p class="task-text">${escHtml(task.text)}</p>
      <div class="task-meta">
        ${prioBadge}${catBadge}${dueBadge}
      </div>
    </div>
    <div class="task-actions">
      <button class="btn-action edit" aria-label="Edit task" title="Edit">✏️</button>
      <button class="btn-action delete" aria-label="Delete task" title="Delete">🗑️</button>
    </div>
  `;

  // Checkbox
  const checkbox = li.querySelector('.task-checkbox');
  checkbox.addEventListener('click', () => toggleTask(task.id));
  checkbox.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleTask(task.id); }
  });

  // Edit
  li.querySelector('.btn-action.edit').addEventListener('click', () => openEdit(task.id));

  // Delete
  li.querySelector('.btn-action.delete').addEventListener('click', () => deleteTask(task.id));

  return li;
}

// ===== Helpers =====
function buildDueBadge(dateStr) {
  const due = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = due < today;
  const label = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `<span class="badge badge-due${isOverdue ? ' overdue' : ''}" aria-label="Due date: ${label}">
    ${isOverdue ? '⚠️' : '📅'} ${label}
  </span>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===== Toast =====
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span aria-hidden="true">${icons[type] || ''}</span> ${escHtml(message)}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 320);
  }, 2800);
}
