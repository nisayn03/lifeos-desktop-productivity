// components/notifications/notifications.js
const { Notification } = require('electron');

class NotificationManager {
  constructor(store, getWindow) {
    this.store = store;
    this.getWindow = getWindow;
    this.timers = [];
    this.attendanceInterval = null;
  }

  fire(title, body, { tag } = {}) {
    if (!Notification.isSupported()) return;
    const n = new Notification({ title, body, silent: !this.store.get('settings.notificationSounds') });
    n.show();
    const win = this.getWindow?.();
    if (win && !win.isDestroyed()) win.webContents.send('notification:fired', { title, body, tag, at: Date.now() });
    return n;
  }

  clearAll() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    if (this.attendanceInterval) clearInterval(this.attendanceInterval);
    this.attendanceInterval = null;
  }

  scheduleAt(hhmm, title, body, opts = {}) {
    const [h, m] = hhmm.split(':').map(Number);
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
    const delay = target - now;
    if (delay <= 0) return;
    this.timers.push(setTimeout(() => this.fire(title, body, opts), delay));
  }

  scheduleBefore(eventHHMM, minutesBefore, title, body, opts = {}) {
    const [h, m] = eventHHMM.split(':').map(Number);
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
    target.setMinutes(target.getMinutes() - minutesBefore);
    const delay = target - now;
    if (delay <= 0) return;
    this.timers.push(setTimeout(() => this.fire(title, body, opts), delay));
  }

  scheduleRepeating(everyMinutes, title, body, stopCheck) {
    const id = setInterval(() => { if (!stopCheck()) this.fire(title, body); }, everyMinutes * 60 * 1000);
    this.timers.push(id);
    return id;
  }

  /** Fires at faceAttendanceTime, then nags every 20 min between 6-8pm until marked done. */
  scheduleFaceAttendance(faceAttendanceTime = '18:00') {
    const isDoneToday = () => this.store.get('attendance.lastMarkedDate') === new Date().toDateString();
    this.scheduleAt(faceAttendanceTime, 'Face Attendance', 'Don\u2019t forget to complete Face Attendance.', { tag: 'attendance' });
    this.attendanceInterval = setInterval(() => {
      const hour = new Date().getHours();
      if (hour < 18 || hour >= 20 || isDoneToday()) return;
      this.fire('Face Attendance — still pending', 'Repeating every 20 minutes until marked done.', { tag: 'attendance' });
    }, 20 * 60 * 1000);
  }

  markAttendanceDone() {
    this.store.set('attendance.lastMarkedDate', new Date().toDateString());
  }

  scheduleExamReminders(exams = []) {
    const now = new Date();
    for (const exam of exams) {
      const days = Math.ceil((new Date(exam.date) - now) / 86400000);
      if (days === 3 || days === 1) {
        this.fire(`${exam.subject} exam in ${days} day${days === 1 ? '' : 's'}`, 'Revision has been prioritized in today\u2019s schedule.', { tag: 'exam' });
      }
    }
  }

  /** Wires the full daily reminder set from today's timeline + habit toggles. */
  scheduleDaily(timeline, faceAttendanceTime, deadlines = [], exams = [], habitReminders = {}) {
    this.clearAll();

    for (const block of timeline) {
      if (block.category === 'college') {
        this.scheduleBefore(block.start, 5, 'Class starting soon', `${block.title} starts in 5 minutes.`);
      }
    }
    for (const d of deadlines) {
      if (d.dueTime) this.scheduleBefore(d.dueTime, 10, 'Deadline approaching', `${d.title} is due in 10 minutes.`);
    }

    this.scheduleFaceAttendance(faceAttendanceTime);
    this.scheduleExamReminders(exams);

    if (habitReminders.water !== false) this.scheduleRepeating(90, 'Water reminder', 'Drink some water \uD83D\uDCA7', () => false);
    if (habitReminders.stretch !== false) this.scheduleRepeating(120, 'Stretch reminder', 'Stand up and stretch for a minute.', () => false);
    if (habitReminders.medicine) (habitReminders.medicineTimes || []).forEach(t => this.scheduleAt(t, 'Medicine reminder', 'Time to take your medicine.'));

    const revision = timeline.find(b => /revision/i.test(b.title));
    if (revision) this.scheduleAt(revision.start, 'Revision time', 'Time to revise today\u2019s topics.');

    const sleep = timeline.find(b => /^sleep/i.test(b.title));
    if (sleep) this.scheduleBefore(sleep.start, 15, 'Wind down', 'Sleep time is in 15 minutes.');

    const journal = timeline.find(b => /journal/i.test(b.title)) || sleep;
    if (journal) this.scheduleBefore(journal.start, 0, 'Daily journal', 'How was today? Take two minutes to reflect.');

    for (const b of (habitReminders.birthdays || [])) {
      this.scheduleAt('09:00', 'Birthday reminder', `Today is ${b.name}\u2019s birthday \uD83C\uDF82`);
    }
  }
}

module.exports = { NotificationManager };
