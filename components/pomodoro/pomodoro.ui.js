// components/pomodoro/pomodoro.ui.js
import { AppState } from '../state/appState.js';

export const Pomodoro = {
  mode: '25/5',
  focusSeconds: 25 * 60,
  breakSeconds: 5 * 60,
  remaining: 25 * 60,
  onBreak: false,
  running: false,
  timerId: null,

  init() {
    this.display = document.getElementById('pomoTime');
    this.collapsedDisplay = document.getElementById('collapsedPomo');
    this.statsEl = document.getElementById('pomoStats');
    document.querySelectorAll('.pomo-modes .chip').forEach(btn => btn.addEventListener('click', () => this.setMode(btn.dataset.mode)));
    document.getElementById('pomoStartBtn').addEventListener('click', () => this.toggleRunning());
    document.getElementById('pomoResetBtn').addEventListener('click', () => this.reset());
    document.getElementById('pomoCustomCancel').addEventListener('click', () => this.closeCustomModal());
    document.getElementById('pomoCustomForm').addEventListener('submit', (e) => this.submitCustomModal(e));
    this.renderStats();
    this.updateDisplay();
  },

  setMode(mode) {
    if (mode === 'custom') {
      document.getElementById('pomoCustomModal').classList.remove('hidden');
      return; // actual mode switch happens in submitCustomModal once the form is filled in
    }
    const [f, b] = mode.split('/').map(n => parseInt(n, 10));
    this.focusSeconds = f * 60;
    this.breakSeconds = b * 60;
    this.mode = mode;
    document.querySelectorAll('.pomo-modes .chip').forEach(c => c.classList.toggle('active', c.dataset.mode === mode));
    this.reset();
  },

  closeCustomModal() { document.getElementById('pomoCustomModal').classList.add('hidden'); },

  submitCustomModal(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const focusMin = parseInt(fd.get('focus'), 10) || 45;
    const breakMin = parseInt(fd.get('brk'), 10) || 15;
    this.focusSeconds = focusMin * 60;
    this.breakSeconds = breakMin * 60;
    this.mode = 'custom';
    document.querySelectorAll('.pomo-modes .chip').forEach(c => c.classList.toggle('active', c.dataset.mode === 'custom'));
    this.reset();
    this.closeCustomModal();
  },

  toggleRunning() { this.running ? this.pause() : this.start(); },

  start() {
    this.running = true;
    document.getElementById('pomoStartBtn').textContent = 'Pause';
    this.timerId = setInterval(() => this.tick(), 1000);
  },

  pause() {
    this.running = false;
    document.getElementById('pomoStartBtn').textContent = 'Start';
    clearInterval(this.timerId);
  },

  reset() {
    this.pause();
    this.onBreak = false;
    this.remaining = this.focusSeconds;
    this.updateDisplay();
  },

  async tick() {
    this.remaining -= 1;
    if (this.remaining <= 0) {
      if (!this.onBreak) {
        await window.lifeos.logPomodoroSession({ mode: this.mode, type: 'focus' });
        AppState.emit('pet:reactTo', 'pomodoroComplete');
        window.lifeos.fireNotification('Pomodoro complete', 'Take a short break.');
        this.onBreak = true;
        this.remaining = this.breakSeconds;
      } else {
        window.lifeos.fireNotification('Break over', 'Back to focus.');
        this.onBreak = false;
        this.remaining = this.focusSeconds;
      }
      this.renderStats();
    }
    this.updateDisplay();
  },

  updateDisplay() {
    const m = String(Math.floor(this.remaining / 60)).padStart(2, '0');
    const s = String(this.remaining % 60).padStart(2, '0');
    const text = `${m}:${s}`;
    this.display.textContent = text;
    this.collapsedDisplay.textContent = text;
    this.display.style.color = this.onBreak ? 'var(--accent-blue)' : 'var(--text-primary)';
  },

  renderStats() {
    const sessions = AppState.get('pomodoro.sessions') || [];
    const todayCount = sessions.filter(s => new Date(s.completedAt).toDateString() === new Date().toDateString() && s.type === 'focus').length;
    this.statsEl.textContent = `${todayCount} focus session${todayCount === 1 ? '' : 's'} today · ${sessions.length} all-time`;
  }
};
