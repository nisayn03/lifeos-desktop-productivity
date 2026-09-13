// components/journal/journal.ui.js
import { AppState } from '../state/appState.js';

export const Journal = {
  init() {
    const form = document.getElementById('journalForm');
    this.hydrateToday(form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const entry = Object.fromEntries(new FormData(form).entries());
      const saved = await window.lifeos.saveJournal(entry);
      const journal = AppState.get('journal') || [];
      const idx = journal.findIndex(j => j.date === saved.date);
      if (idx >= 0) journal[idx] = saved; else journal.push(saved);
      AppState.data.journal = journal;
      AppState.emit('pet:reactTo', 'journalSaved');
      window.lifeos.fireNotification('Journal saved', 'Today\u2019s reflection is in the books.');
    });
  },

  hydrateToday(form) {
    const today = new Date().toDateString();
    const entry = (AppState.get('journal') || []).find(j => j.date === today);
    if (!entry) return;
    ['howWasYourDay', 'whatDistractedYou', 'whatDidYouLearn', 'whatMadeYouHappy'].forEach(field => {
      if (form.elements[field]) form.elements[field].value = entry[field] || '';
    });
  }
};
