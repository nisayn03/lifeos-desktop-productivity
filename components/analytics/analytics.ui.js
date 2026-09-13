// components/analytics/analytics.ui.js
import { AppState } from '../state/appState.js';

export const Analytics = {
  init() { this.render(); },

  computeWeek() {
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
    const sessions = AppState.get('pomodoro.sessions') || [];
    const todos = AppState.get('todos') || [];
    return days.map(d => {
      const key = d.toDateString();
      const focusSessions = sessions.filter(s => new Date(s.completedAt).toDateString() === key && s.type === 'focus');
      const completedTasks = todos.filter(t => t.done && t.completedAt && new Date(t.completedAt).toDateString() === key);
      return { label: d.toLocaleDateString('default', { weekday: 'short' }), focusHours: +(focusSessions.length * 0.42).toFixed(1), completed: completedTasks.length };
    });
  },

  subjectBreakdown() {
    const todos = AppState.get('todos') || [];
    const bySubject = {};
    for (const t of todos) {
      if (!t.category) continue;
      bySubject[t.category] = (bySubject[t.category] || 0) + (t.done ? 1 : 0);
    }
    return Object.entries(bySubject).sort((a, b) => b[1] - a[1]);
  },

  render() {
    const week = this.computeWeek();
    const totalFocus = week.reduce((s, d) => s + d.focusHours, 0);
    const totalCompleted = week.reduce((s, d) => s + d.completed, 0);
    const best = week.reduce((a, b) => (b.focusHours > a.focusHours ? b : a), week[0]);
    const streak = AppState.get('pomodoro.streak') || 0;

    document.getElementById('analyticsSummary').innerHTML = `
      <div class="stat-card"><div class="stat-value">${totalFocus.toFixed(1)}h</div><div class="stat-label">Focus this week</div></div>
      <div class="stat-card"><div class="stat-value">${totalCompleted}</div><div class="stat-label">Tasks completed</div></div>
      <div class="stat-card"><div class="stat-value">${best?.label || '—'}</div><div class="stat-label">Most productive day</div></div>
      <div class="stat-card"><div class="stat-value">${streak}🔥</div><div class="stat-label">Current streak</div></div>
    `;

    this.drawChart(week);

    const breakdown = this.subjectBreakdown();
    document.getElementById('subjectBreakdown').innerHTML = breakdown.length
      ? `<strong>Subject-wise completed tasks:</strong><br/>${breakdown.map(([k, v]) => `${k}: ${v}`).join(' · ')}`
      : '';
  },

  drawChart(week) {
    const canvas = document.getElementById('analyticsChart');
    const ctx = canvas.getContext('2d');
    const styles = getComputedStyle(document.body);
    const accent = styles.getPropertyValue('--accent-amber').trim() || '#F2A93B';
    const muted = styles.getPropertyValue('--text-muted').trim() || '#8B93A1';

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const max = Math.max(...week.map(d => d.focusHours), 1);
    const barWidth = canvas.width / week.length;

    week.forEach((d, i) => {
      const barHeight = (d.focusHours / max) * (canvas.height - 30);
      const x = i * barWidth + barWidth * 0.25;
      const y = canvas.height - barHeight - 20;
      ctx.fillStyle = accent; ctx.globalAlpha = 0.85;
      ctx.fillRect(x, y, barWidth * 0.5, barHeight);
      ctx.globalAlpha = 1; ctx.fillStyle = muted; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(d.label, x + barWidth * 0.25, canvas.height - 6);
    });
  }
};
