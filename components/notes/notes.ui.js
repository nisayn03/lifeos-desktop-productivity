// components/notes/notes.ui.js
import { AppState, escapeHtml } from '../state/appState.js';

export const Notes = {
  el: null,
  query: '',

  init() {
    this.el = document.getElementById('noteList');
    document.getElementById('addNoteBtn').addEventListener('click', () => this.addNote());
    document.getElementById('noteSearch').addEventListener('input', (e) => { this.query = e.target.value.toLowerCase(); this.render(); });
    this.render();
  },

  async addNote() {
    const note = { title: 'Untitled', body: '', pinned: false, kind: 'markdown', createdAt: Date.now() };
    const saved = await window.lifeos.saveNote(note);
    AppState.data.notes = AppState.data.notes || [];
    AppState.data.notes.push(saved);
    this.render();
  },

  async update(id, patch) {
    const notes = AppState.get('notes') || [];
    const note = notes.find(n => n.id === id);
    if (!note) return;
    await window.lifeos.saveNote({ ...note, ...patch });
    Object.assign(note, patch);
  },

  async remove(id) {
    const notes = await window.lifeos.deleteNote(id);
    AppState.data.notes = notes;
    this.render();
  },

  render() {
    let notes = [...(AppState.get('notes') || [])].sort((a, b) => Number(b.pinned) - Number(a.pinned));
    if (this.query) notes = notes.filter(n => n.title.toLowerCase().includes(this.query) || n.body.toLowerCase().includes(this.query));

    if (!notes.length) {
      this.el.innerHTML = `<p style="color:var(--text-muted);font-size:12.5px;">No notes match.</p>`;
      return;
    }
    this.el.innerHTML = notes.map(n => `
      <div class="note-card ${n.pinned ? 'pinned' : ''}" data-id="${n.id}">
        <div class="note-card-title">
          <span>${n.pinned ? '📌 ' : ''}${escapeHtml(n.title)}</span>
          <span><button class="todo-del" data-action="pin" title="Pin">${n.pinned ? '★' : '☆'}</button><button class="todo-del" data-action="delete" title="Delete">✕</button></span>
        </div>
        <textarea rows="4" data-action="body">${escapeHtml(n.body)}</textarea>
      </div>
    `).join('');

    this.el.querySelectorAll('.note-card').forEach(card => {
      const id = card.dataset.id;
      card.querySelector('[data-action="pin"]').addEventListener('click', () => {
        const note = (AppState.get('notes') || []).find(n => n.id === id);
        this.update(id, { pinned: !note.pinned }).then(() => this.render());
      });
      card.querySelector('[data-action="delete"]').addEventListener('click', () => this.remove(id));
      const textarea = card.querySelector('[data-action="body"]');
      let debounce;
      textarea.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => this.update(id, { body: textarea.value }), 400);
      });
    });
  }
};
