// components/home/home.ui.js
import { AppState, escapeHtml } from '../state/appState.js';
import { Timeline } from '../timeline/timeline.ui.js';

const QUOTES = [
  'Discipline is choosing between what you want now and what you want most.',
  'Small steps, repeated daily, outrun big plans made once.',
  'Done is better than perfect — ship the revision, not the rewrite.',
  'Your future self is built in the next 25 minutes.',
  'Progress hides in boring, consistent days.'
];

export const Home = {
  init() { this.render(); },

  render() {
    document.getElementById('homeQuote').textContent = `\u201C${QUOTES[new Date().getDate() % QUOTES.length]}\u201D`;

    const timeline = AppState.get('timeline') || [];
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const upcoming = timeline.filter(b => Timeline.toMinutes(b.start) >= nowMin).slice(0, 4);
    document.getElementById('homeScheduleMini').innerHTML = upcoming.length
      ? upcoming.map(b => `<div class="mini-row"><span>${escapeHtml(b.title)}</span><span>${b.start}</span></div>`).join('')
      : '<div class="mini-row">Nothing left today.</div>';

    const todos = (AppState.get('todos') || []).filter(t => !t.done).slice(0, 4);
    document.getElementById('homeTasksMini').innerHTML = todos.length
      ? todos.map(t => `<div class="mini-row"><span>${escapeHtml(t.title)}</span><span class="badge priority-${t.priority}">${t.priority}</span></div>`).join('')
      : '<div class="mini-row">All caught up.</div>';

    const deadlines = (AppState.get('todos') || []).filter(t => t.deadline && !t.done)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 4);
    document.getElementById('homeDeadlinesMini').innerHTML = deadlines.length
      ? deadlines.map(d => `<div class="mini-row"><span>${escapeHtml(d.title)}</span><span>${d.deadline}</span></div>`).join('')
      : '<div class="mini-row">No deadlines on file.</div>';

    const sessions = AppState.get('pomodoro.sessions') || [];
    const todayFocus = sessions.filter(s => new Date(s.completedAt).toDateString() === new Date().toDateString() && s.type === 'focus').length;
    document.getElementById('homeStudyMini').innerHTML = `
      <div class="mini-row"><span>Focus sessions today</span><span>${todayFocus}</span></div>
      <div class="mini-row"><span>Completed blocks</span><span>${timeline.filter(b => b.status === 'completed').length}</span></div>
    `;
  }
};
