// renderer.js
import { AppState } from './components/state/appState.js';
import { Timeline } from './components/timeline/timeline.ui.js';
import { Todo } from './components/todo/todo.ui.js';
import { Deadlines } from './components/deadlines/deadlines.ui.js';
import { Exams } from './components/scheduler/exams.ui.js';
import { Pomodoro } from './components/pomodoro/pomodoro.ui.js';
import { Notes } from './components/notes/notes.ui.js';
import { Journal } from './components/journal/journal.ui.js';
import { CalendarView } from './components/calendar/calendar.ui.js';
import { Analytics } from './components/analytics/analytics.ui.js';
import { Coach } from './components/coach/coach.ui.js';
import { SchedulerUI } from './components/scheduler/scheduler.ui.js';
import { Settings } from './components/settings/settings.ui.js';
import { Voice } from './components/voice/voice.ui.js';
import { Pet } from './components/pet/pet.ui.js';
import { Home } from './components/home/home.ui.js';

(async function bootstrap() {
  await AppState.load();

  document.body.dataset.theme = AppState.get('settings.theme') || 'glass';
  document.body.dataset.mode = AppState.get('windowState.mode') || 'collapsed';

  initClocks();
  initModeToggle();
  initNav();
  initQuickAdd();

  Home.init();
  Timeline.init();
  Todo.init();
  Deadlines.init();
  Exams.init();
  Pomodoro.init();
  Notes.init();
  Journal.init();
  CalendarView.init();
  Analytics.init();
  Coach.init();
  SchedulerUI.init();
  Settings.init();
  Voice.init();
  Pet.init();

  AppState.on('nav:goto', (section) => gotoSection(section));

  window.lifeos.onQuickAddShortcut(() => openQuickAdd());
  window.lifeos.onNotificationFired(({ title, body }) => {
    document.getElementById('bellDot').classList.remove('hidden');
    if (AppState.get('settings.ttsEnabled')) Voice.speak(`${title}. ${body}`);
  });
  window.lifeos.onDataRestored(async () => { await AppState.load(); location.reload(); });

  document.getElementById('bellBtn').addEventListener('click', () => document.getElementById('bellDot').classList.add('hidden'));
})();

function initClocks() {
  const collapsed = document.getElementById('clockCollapsed');
  const expanded = document.getElementById('clockExpanded');
  const tick = () => {
    const now = new Date();
    collapsed.textContent = now.toTimeString().slice(0, 5);
    expanded.textContent = now.toTimeString().slice(0, 8);
  };
  tick();
  setInterval(tick, 1000);
}

function initModeToggle() {
  document.getElementById('expandBtn').addEventListener('click', async () => {
    await window.lifeos.expand();
    document.body.dataset.mode = 'expanded';
  });
  document.getElementById('collapseBtn').addEventListener('click', async () => {
    await window.lifeos.collapse();
    document.body.dataset.mode = 'collapsed';
  });
}

function initNav() {
  document.querySelectorAll('.rail-btn').forEach(btn => btn.addEventListener('click', () => gotoSection(btn.dataset.section)));
}

function gotoSection(section) {
  document.querySelectorAll('.rail-btn').forEach(b => b.classList.toggle('active', b.dataset.section === section));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${section}`));
  if (section === 'analytics') Analytics.render();
  if (section === 'calendar') CalendarView.render();
  if (section === 'home') Home.render();
}

function initQuickAdd() {
  const input = document.getElementById('quickAddInput');
  document.getElementById('quickAddBtn').addEventListener('click', openQuickAdd);
  document.getElementById('quickAddCancel').addEventListener('click', closeQuickAdd);
  document.getElementById('quickAddSave').addEventListener('click', saveQuickAdd);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveQuickAdd(); });

  async function saveQuickAdd() {
    const title = input.value.trim();
    if (!title) return;
    const todo = await window.lifeos.addTodo({ title, priority: 'medium', category: 'Personal', deadline: null });
    AppState.data.todos = AppState.data.todos || [];
    AppState.data.todos.push(todo);
    Todo.render();
    closeQuickAdd();
  }
}

function openQuickAdd() {
  document.getElementById('quickAddModal').classList.remove('hidden');
  const input = document.getElementById('quickAddInput');
  input.value = '';
  input.focus();
}
function closeQuickAdd() { document.getElementById('quickAddModal').classList.add('hidden'); }
