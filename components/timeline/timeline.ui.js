// components/timeline/timeline.ui.js
import { AppState, escapeHtml } from '../state/appState.js';

export const Timeline = {
  el: null,
  ringFg: null,

  init() {
    this.el = document.getElementById('timelineList');
    this.ringFg = document.getElementById('ringFg');
    document.getElementById('regenBtn').addEventListener('click', () => AppState.emit('nav:goto', 'planner'));
    this.render();
    setInterval(() => this.render(), 15000);
  },

  toMinutes(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; },

  computeStatus(block, nowMin) {
    if (block.status === 'completed' || block.status === 'missed') return block.status;
    const start = this.toMinutes(block.start);
    const end = this.toMinutes(block.end);
    if (nowMin < start) return 'upcoming';
    if (nowMin >= start && nowMin < end) return 'current';
    return 'missed';
  },

  render() {
    const timeline = AppState.get('timeline') || [];
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    if (!timeline.length) {
      this.el.innerHTML = `<p style="color:var(--text-muted);font-size:12.5px;">No schedule yet. Open the AI Planner tab to generate today's timeline.</p>`;
    } else {
      this.el.innerHTML = timeline.map(block => {
        const status = this.computeStatus(block, nowMin);
        const start = this.toMinutes(block.start), end = this.toMinutes(block.end);
        const duration = Math.max(end - start, 1);
        const elapsed = Math.min(Math.max(nowMin - start, 0), duration);
        const pct = status === 'completed' ? 100 : Math.round((elapsed / duration) * 100);
        const remaining = Math.max(end - nowMin, 0);
        const hint = status === 'completed' ? 'Click to undo' : 'Click to mark done';
        return `
          <div class="t-block ${status} t-clickable" data-id="${block.id}" title="${hint}">
            <div class="t-title">${escapeHtml(block.title)}</div>
            <div class="t-meta">${block.start} – ${block.end} · ${statusLabel(status, remaining)}</div>
            <div class="t-progress-bar"><div class="t-progress-fill" style="width:${pct}%"></div></div>
          </div>`;
      }).join('');
      this.el.querySelectorAll('.t-clickable').forEach(el => {
        el.addEventListener('click', () => this.toggleComplete(el.dataset.id));
      });
    }

    const current = timeline.find(b => this.computeStatus(b, nowMin) === 'current');
    const next = timeline.find(b => this.computeStatus(b, nowMin) === 'upcoming');
    document.getElementById('collapsedCurrent').textContent = current ? current.title : 'Free time';
    document.getElementById('collapsedNext').textContent = next ? `Next: ${next.title} @ ${next.start}` : 'Next: —';

    if (current) {
      const start = this.toMinutes(current.start), end = this.toMinutes(current.end);
      const pct = Math.min(Math.max((nowMin - start) / Math.max(end - start, 1), 0), 1);
      this.ringFg.style.strokeDashoffset = String(119.4 * (1 - pct));
    } else {
      this.ringFg.style.strokeDashoffset = '119.4';
    }
  },

  async markComplete(id) {
    const timeline = await window.lifeos.updateBlockStatus({ id, status: 'completed' });
    AppState.data.timeline = timeline;
    this.render();
  },

  /** Toggles a block between 'completed' and its natural live status. Undoing
   *  sets status back to 'upcoming' rather than clearing it — computeStatus()
   *  only short-circuits on 'completed'/'missed', so from 'upcoming' it will
   *  correctly recompute to current/upcoming/missed from the actual time on
   *  the very next render, exactly as if it had never been touched. */
  async toggleComplete(id) {
    const block = (AppState.get('timeline') || []).find(b => b.id === id);
    if (!block) return;
    const nextStatus = block.status === 'completed' ? 'upcoming' : 'completed';
    const timeline = await window.lifeos.updateBlockStatus({ id, status: nextStatus });
    AppState.data.timeline = timeline;
    this.render();
  }
};

function statusLabel(status, remaining) {
  switch (status) {
    case 'current': return `In progress · ${remaining}m left`;
    case 'completed': return 'Completed';
    case 'missed': return 'Missed';
    default: return 'Upcoming';
  }
}
