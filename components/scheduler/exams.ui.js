// components/scheduler/exams.ui.js
import { AppState, escapeHtml } from '../state/appState.js';

export const Exams = {
  el: null,

  init() {
    this.el = document.getElementById('examList');
    document.getElementById('addExamBtn').addEventListener('click', () => this.openModal());
    document.getElementById('examCancel').addEventListener('click', () => this.closeModal());
    document.getElementById('examForm').addEventListener('submit', (e) => this.submitModal(e));
    this.render();
  },

  openModal() {
    document.getElementById('examForm').reset();
    document.getElementById('examModal').classList.remove('hidden');
    document.querySelector('#examForm [name="subject"]').focus();
  },

  closeModal() { document.getElementById('examModal').classList.add('hidden'); },

  async submitModal(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const subject = (fd.get('subject') || '').trim();
    const date = fd.get('date');
    if (!subject || !date) return;
    const exam = await window.lifeos.addExam({ subject, date });
    AppState.data.exams = AppState.data.exams || [];
    AppState.data.exams.push(exam);
    this.render();
    this.closeModal();
  },

  async remove(id) {
    const exams = await window.lifeos.deleteExam(id);
    AppState.data.exams = exams;
    this.render();
  },

  render() {
    const exams = [...(AppState.get('exams') || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!exams.length) {
      this.el.innerHTML = `<p style="color:var(--text-muted);font-size:12.5px;">No exams on file.</p>`;
      return;
    }
    const now = new Date();
    this.el.innerHTML = exams.map(e => {
      const days = Math.ceil((new Date(e.date) - now) / 86400000);
      const urgency = days <= 3 ? 'danger' : days <= 7 ? 'warn' : '';
      return `
        <div class="deadline-item ${urgency}">
          <div><div class="todo-title">${escapeHtml(e.subject)}</div><div class="badge">${e.date}</div></div>
          <div class="deadline-countdown">${days}d away <button class="todo-del" data-id="${e.id}">✕</button></div>
        </div>`;
    }).join('');
    this.el.querySelectorAll('.todo-del').forEach(btn => btn.addEventListener('click', () => this.remove(btn.dataset.id)));
  }
};
