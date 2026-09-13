// components/deadlines/deadlines.ui.js
import { AppState, escapeHtml } from '../state/appState.js';

export const Deadlines = {
  el: null,
  range: 'today',

  init() {
    this.el = document.getElementById('deadlineList');
    document.querySelectorAll('#deadlineTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#deadlineTabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.range = tab.dataset.range;
        this.render();
      });
    });
    this.render();
  },

  sourceItems() {
    const todos = (AppState.get('todos') || []).filter(t => t.deadline && !t.done)
      .map(t => ({ id: t.id, title: t.title, date: t.deadline, category: t.category }));
    const explicit = AppState.get('deadlines') || [];
    return [...todos, ...explicit];
  },

  filterByRange(items) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return items.filter(it => {
      const diffDays = Math.round((new Date(it.date) - today) / 86400000);
      switch (this.range) {
        case 'today': return diffDays === 0;
        case 'tomorrow': return diffDays === 1;
        case 'week': return diffDays >= 0 && diffDays <= 7;
        case 'upcoming': return diffDays > 0;
        case 'overdue': return diffDays < 0;
        default: return true;
      }
    });
  },

  render() {
    const items = this.filterByRange(this.sourceItems());
    if (!items.length) {
      this.el.innerHTML = `<p style="color:var(--text-muted);font-size:12.5px;">Nothing here.</p>`;
      return;
    }
    const now = new Date();
    this.el.innerHTML = items.map(it => {
      const due = new Date(it.date);
      const diffMs = due - now;
      const diffDays = Math.floor(diffMs / 86400000);
      const diffHours = Math.floor((diffMs % 86400000) / 3600000);
      const urgency = diffDays < 0 ? 'danger' : diffDays <= 1 ? 'warn' : '';
      const countdown = diffDays < 0 ? `${Math.abs(diffDays)}d overdue` : `${diffDays}d ${diffHours}h left`;
      return `
        <div class="deadline-item ${urgency}">
          <div><div class="todo-title">${escapeHtml(it.title)}</div><div class="badge">${it.category || 'General'}</div></div>
          <div class="deadline-countdown">${countdown}</div>
        </div>`;
    }).join('');
  }
};
