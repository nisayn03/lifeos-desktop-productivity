// main.js
const { app, ipcMain, BrowserWindow } = require('electron');
const { Store } = require('./database/store');
const { createWidgetWindow, setMode } = require('./core/windowManager');
const { createTray } = require('./core/trayManager');
const { NotificationManager } = require('./components/notifications/notifications');
const scheduler = require('./components/scheduler/scheduler');
const coach = require('./components/coach/coach');
const commandParser = require('./components/voice/commandParser');
const backup = require('./components/storage/backup');

let win = null;
let tray = null;
let store = null;
let notifier = null;

function broadcast(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function currentAiConfig() {
  return {
    baseUrl: store.get('settings.aiBaseUrl'),
    apiKey: store.get('settings.aiApiKey'),
    model: store.get('settings.aiModel')
  };
}

function registerIpc() {
  // store
  ipcMain.handle('store:get', (_e, keyPath) => store.get(keyPath));
  ipcMain.handle('store:set', (_e, keyPath, value) => store.set(keyPath, value));
  ipcMain.handle('store:all', () => store.all());

  // window
  ipcMain.handle('window:setMode', (_e, mode) => { setMode(win, store, mode); return mode; });
  ipcMain.handle('window:collapse', () => setMode(win, store, 'collapsed'));
  ipcMain.handle('window:expand', () => setMode(win, store, 'expanded'));
  ipcMain.handle('window:hide', () => win.hide());
  ipcMain.handle('window:show', () => win.show());
  ipcMain.handle('window:quit', () => app.quit());

  // scheduler
  ipcMain.handle('scheduler:generate', async (_e, { profile } = {}) => {
    if (profile) store.set('profile', { ...store.get('profile'), ...profile });
    const exams = store.get('exams') || [];
    const deadlines = store.get('deadlines') || [];
    const aiConfig = currentAiConfig();
    const result = aiConfig.apiKey
      ? await scheduler.buildScheduleWithAI(store.get('profile'), exams, deadlines, aiConfig)
      : scheduler.buildSchedule(store.get('profile'), exams, deadlines);
    store.set('timeline', result.blocks);
    notifier.scheduleDaily(result.blocks, result.faceAttendanceTime, deadlines, exams, store.get('settings.habitReminders') || {});
    return result.blocks;
  });

  ipcMain.handle('scheduler:reflow', (_e, { fromTime, deltaMinutes }) => {
    const blocks = scheduler.reflow(store.get('timeline') || [], fromTime, deltaMinutes);
    store.set('timeline', blocks);
    return blocks;
  });

  ipcMain.handle('scheduler:updateBlockStatus', (_e, { id, status }) => {
    const timeline = (store.get('timeline') || []).map(b => b.id === id ? { ...b, status } : b);
    store.set('timeline', timeline);
    return timeline;
  });

  // exams
  ipcMain.handle('exams:add', (_e, exam) => {
    const exams = store.get('exams') || [];
    const withId = { id: 'e_' + Date.now().toString(36), ...exam };
    exams.push(withId);
    store.set('exams', exams);
    return withId;
  });
  ipcMain.handle('exams:delete', (_e, id) => {
    const exams = (store.get('exams') || []).filter(e => e.id !== id);
    store.set('exams', exams);
    return exams;
  });

  // todos (with drag-and-drop order + recurring + attachments fields)
  ipcMain.handle('todos:add', (_e, todo) => {
    const todos = store.get('todos') || [];
    const withId = { id: 't_' + Date.now().toString(36), done: false, progress: 0, order: todos.length, attachments: [], ...todo };
    todos.push(withId);
    store.set('todos', todos);
    return withId;
  });
  ipcMain.handle('todos:update', (_e, { id, patch }) => {
    const todos = (store.get('todos') || []).map(t => t.id === id ? { ...t, ...patch } : t);
    store.set('todos', todos);
    return todos;
  });
  ipcMain.handle('todos:reorder', (_e, orderedIds) => {
    const todos = store.get('todos') || [];
    const byId = Object.fromEntries(todos.map(t => [t.id, t]));
    const reordered = orderedIds.map((id, i) => ({ ...byId[id], order: i })).filter(Boolean);
    store.set('todos', reordered);
    return reordered;
  });
  ipcMain.handle('todos:delete', (_e, id) => {
    const todos = (store.get('todos') || []).filter(t => t.id !== id);
    store.set('todos', todos);
    return todos;
  });

  // journal
  ipcMain.handle('journal:save', (_e, entry) => {
    const journal = store.get('journal') || [];
    const today = new Date().toDateString();
    const idx = journal.findIndex(j => j.date === today);
    const record = { date: today, ...entry };
    if (idx >= 0) journal[idx] = record; else journal.push(record);
    store.set('journal', journal);
    return record;
  });

  // notes
  ipcMain.handle('notes:save', (_e, note) => {
    const notes = store.get('notes') || [];
    const withId = note.id ? note : { id: 'n_' + Date.now().toString(36), ...note };
    const idx = notes.findIndex(n => n.id === withId.id);
    if (idx >= 0) notes[idx] = withId; else notes.push(withId);
    store.set('notes', notes);
    return withId;
  });
  ipcMain.handle('notes:delete', (_e, id) => {
    const notes = (store.get('notes') || []).filter(n => n.id !== id);
    store.set('notes', notes);
    return notes;
  });

  // voice
  ipcMain.handle('voice:save', (_e, note) => {
    const voiceNotes = store.get('voiceNotes') || [];
    const withId = { id: 'v_' + Date.now().toString(36), createdAt: Date.now(), ...note };
    voiceNotes.push(withId);
    store.set('voiceNotes', voiceNotes);
    return withId;
  });
  ipcMain.handle('voice:command', (_e, transcript) => commandParser.interpret(transcript));

  // attendance
  ipcMain.handle('attendance:markDone', () => { notifier.markAttendanceDone(); return true; });

  // pomodoro
  ipcMain.handle('pomodoro:logSession', (_e, session) => {
    const pomodoro = store.get('pomodoro') || { sessions: [], streak: 0 };
    pomodoro.sessions.push({ id: 'p_' + Date.now().toString(36), completedAt: Date.now(), ...session });
    store.set('pomodoro', pomodoro);
    return pomodoro;
  });

  // coach
  ipcMain.handle('coach:ask', async (_e, question) => coach.answerWithAI(question, store, currentAiConfig()));

  // backup
  ipcMain.handle('data:export', () => backup.exportBackup(win, store));
  ipcMain.handle('data:import', async () => {
    const data = await backup.importBackup(win, store);
    if (data) broadcast('data:restored', data);
    return data;
  });

  // notifications
  ipcMain.handle('notify:fire', (_e, { title, body }) => notifier.fire(title, body));
}

app.whenReady().then(() => {
  store = new Store();
  win = createWidgetWindow(store);
  notifier = new NotificationManager(store, () => win);
  tray = createTray(win, store, {
    onToggle: () => (win.isVisible() ? win.hide() : win.show()),
    onQuickAdd: () => broadcast('shortcut:quickAdd')
  });
  registerIpc();

  const existingTimeline = store.get('timeline');
  if (existingTimeline && existingTimeline.length) {
    notifier.scheduleDaily(existingTimeline, '18:00', store.get('deadlines') || [], store.get('exams') || [], store.get('settings.habitReminders') || {});
  }

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) win = createWidgetWindow(store); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { notifier?.clearAll(); store?.save(); });
