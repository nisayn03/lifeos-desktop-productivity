// components/todo/todo.ui.js
import { AppState, escapeHtml } from '../state/appState.js';

const CATEGORIES = ['College', 'DSA', 'Aptitude', 'Projects', 'Flutter', 'Advanced Java', 'Assignments', 'Health', 'Personal', 'Custom'];

export const Todo = {
  el: null,
  activeFilter: 'All',
  dragId: null,

  init() {
    this.el = document.getElementById('todoList');
    this.renderFilters();
    this.render();
    this.populateCategorySelect();
    document.getElementById('addTodoBtn').addEventListener('click', () => this.openModal());
    document.getElementById('taskCancel').addEventListener('click', () => this.closeModal());
    document.getElementById('taskForm').addEventListener('submit', (e) => this.submitModal(e));
  },

  populateCategorySelect() {
    const select = document.getElementById('taskCategorySelect');
    select.innerHTML = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
  },

  renderFilters() {
    const row = document.getElementById('todoFilters');
    const cats = ['All', ...CATEGORIES];
    row.innerHTML = cats.map(c => `<button class="chip ${c === this.activeFilter ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('');
    row.querySelectorAll('.chip').forEach(btn => {
      btn.addEventListener('click', () => { this.activeFilter = btn.dataset.cat; this.renderFilters(); this.render(); });
    });
  },

  openModal() {
    document.getElementById('taskForm').reset();
    document.getElementById('taskModal').classList.remove('hidden');
    document.querySelector('#taskForm [name="title"]').focus();
  },

  closeModal() { document.getElementById('taskModal').classList.add('hidden'); },

  async submitModal(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const title = (fd.get('title') || '').trim();
    if (!title) return;
    const todo = await window.lifeos.addTodo({
      title,
      description: fd.get('description') || '',
      priority: fd.get('priority') || 'medium',
      category: fd.get('category') || 'Personal',
      deadline: fd.get('deadline') || null,
      recurring: fd.get('recurring') === 'on',
      tags: [],
      notes: ''
    });
    AppState.data.todos = AppState.data.todos || [];
    AppState.data.todos.push(todo);
    this.render();
    this.closeModal();
  },

  async toggle(id) {
    const todo = (AppState.get('todos') || []).find(t => t.id === id);
    if (!todo) return;
    const done = !todo.done;
    const patch = { done, progress: done ? 100 : todo.progress };
    if (done) patch.completedAt = Date.now();
    const todos = await window.lifeos.updateTodo({ id, patch });
    AppState.data.todos = todos;
    this.render();
    if (done) AppState.emit('pet:reactTo', 'taskCompleted');
  },

  async remove(id) {
    const todos = await window.lifeos.deleteTodo(id);
    AppState.data.todos = todos;
    this.render();
  },

  async persistOrder() {
    const ids = [...this.el.querySelectorAll('.todo-item')].map(el => el.dataset.id);
    const todos = await window.lifeos.reorderTodos(ids);
    AppState.data.todos = todos;
  },

  render() {
    let todos = [...(AppState.get('todos') || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (this.activeFilter !== 'All') todos = todos.filter(t => t.category === this.activeFilter);
    todos = [...todos].sort((a, b) => Number(a.done) - Number(b.done));

    if (!todos.length) {
      this.el.innerHTML = `<p style="color:var(--text-muted);font-size:12.5px;">No tasks in this category yet.</p>`;
      return;
    }

    this.el.innerHTML = todos.map(t => `
      <div class="todo-item ${t.done ? 'done' : ''}" data-id="${t.id}" draggable="true">
        <button class="todo-check" data-action="toggle">${t.done ? '✓' : ''}</button>
        <div class="todo-body">
          <div class="todo-title">${escapeHtml(t.title)}</div>
          <div class="todo-meta">
            <span class="badge priority-${t.priority}">${t.priority}</span>
            <span class="badge">${t.category}</span>
            ${t.deadline ? `<span class="badge">due ${t.deadline}</span>` : ''}
            ${t.recurring ? `<span class="badge">recurring</span>` : ''}
          </div>
        </div>
        <button class="todo-del" data-action="delete">✕</button>
      </div>
    `).join('');

    this.el.querySelectorAll('[data-action="toggle"]').forEach(btn => btn.addEventListener('click', (e) => this.toggle(e.target.closest('.todo-item').dataset.id)));
    this.el.querySelectorAll('[data-action="delete"]').forEach(btn => btn.addEventListener('click', (e) => this.remove(e.target.closest('.todo-item').dataset.id)));
    this.wireDragAndDrop();
  },

  wireDragAndDrop() {
    const items = [...this.el.querySelectorAll('.todo-item')];
    items.forEach(item => {
      item.addEventListener('dragstart', () => { this.dragId = item.dataset.id; item.classList.add('dragging'); });
      item.addEventListener('dragend', () => { item.classList.remove('dragging'); this.persistOrder(); });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        const dragging = this.el.querySelector('.dragging');
        if (!dragging || dragging === item) return;
        const rect = item.getBoundingClientRect();
        const after = (e.clientY - rect.top) > rect.height / 2;
        item.parentNode.insertBefore(dragging, after ? item.nextSibling : item);
      });
    });
  }
};
