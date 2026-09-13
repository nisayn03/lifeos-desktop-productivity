// components/calendar/calendar.ui.js
import { AppState, escapeHtml } from '../state/appState.js';

export const CalendarView = {
  cursor: new Date(),

  init() {
    document.getElementById('calPrev').addEventListener('click', () => this.shiftMonth(-1));
    document.getElementById('calNext').addEventListener('click', () => this.shiftMonth(1));
    this.render();
  },

  shiftMonth(delta) { this.cursor.setMonth(this.cursor.getMonth() + delta); this.render(); },

  eventsForDate(dateStr) {
    const journal = (AppState.get('journal') || []).find(j => j.date === new Date(dateStr).toDateString());
    const todosDue = (AppState.get('todos') || []).filter(t => t.deadline === dateStr);
    const attendanceMarked = AppState.get('attendance.lastMarkedDate') === new Date(dateStr).toDateString();
    return { journal, todosDue, attendanceMarked };
  },

  render() {
    const grid = document.getElementById('calendarGrid');
    const label = document.getElementById('calMonthLabel');
    const year = this.cursor.getFullYear(), month = this.cursor.getMonth();
    label.textContent = this.cursor.toLocaleString('default', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    let html = '';
    for (let i = 0; i < firstDay; i++) html += `<div class="cal-cell empty"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = dateObj.toISOString().slice(0, 10);
      const isToday = dateObj.toDateString() === today.toDateString();
      const { journal, todosDue } = this.eventsForDate(dateStr);
      const hasEvents = !!journal || todosDue.length > 0;
      html += `<div class="cal-cell ${isToday ? 'today' : ''} ${hasEvents ? 'has-events' : ''}" data-date="${dateStr}">${d}</div>`;
    }
    grid.innerHTML = html;
    grid.querySelectorAll('.cal-cell:not(.empty)').forEach(cell => cell.addEventListener('click', () => this.showDay(cell.dataset.date)));
  },

  showDay(dateStr) {
    const detail = document.getElementById('calendarDayDetail');
    const { journal, todosDue, attendanceMarked } = this.eventsForDate(dateStr);
    let html = `<strong>${dateStr}</strong><br/>`;
    html += todosDue.length ? `Due: ${todosDue.map(t => escapeHtml(t.title)).join(', ')}<br/>` : `No deadlines.<br/>`;
    html += `Face attendance: ${attendanceMarked ? 'marked' : 'not marked'}<br/>`;
    html += journal ? `Journal: "${escapeHtml((journal.howWasYourDay || '').slice(0, 80))}"` : `No journal entry.`;
    detail.innerHTML = html;
  }
};
