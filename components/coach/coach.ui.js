// components/coach/coach.ui.js
import { escapeHtml } from '../state/appState.js';

const SUGGESTIONS = [
  'What should I do next?',
  'Can I finish today\u2019s work?',
  'Which subject needs attention?',
  'How productive was I today?',
  'What should I postpone?',
  'How much free time do I have?',
  'What are my upcoming deadlines?',
  'How am I progressing toward placements?'
];

export const Coach = {
  logEl: null,

  init() {
    this.logEl = document.getElementById('coachLog');
    const suggestions = document.getElementById('coachSuggestions');
    suggestions.innerHTML = SUGGESTIONS.map(s => `<button data-q="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('');
    suggestions.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => this.ask(btn.dataset.q)));

    const form = document.getElementById('coachForm');
    const input = document.getElementById('coachInput');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      input.value = '';
      this.ask(q);
    });
  },

  async ask(question) {
    this.appendMsg(question, 'user');
    const thinking = this.appendMsg('…', 'coach');
    const answer = await window.lifeos.askCoach(question);
    thinking.textContent = answer;
  },

  appendMsg(text, who) {
    const div = document.createElement('div');
    div.className = `coach-msg ${who}`;
    div.textContent = text;
    this.logEl.appendChild(div);
    this.logEl.scrollTop = this.logEl.scrollHeight;
    return div;
  }
};
