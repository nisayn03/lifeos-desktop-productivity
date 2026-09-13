// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lifeos', {
  getData: (keyPath) => ipcRenderer.invoke('store:get', keyPath),
  setData: (keyPath, value) => ipcRenderer.invoke('store:set', keyPath, value),
  getAllData: () => ipcRenderer.invoke('store:all'),

  setMode: (mode) => ipcRenderer.invoke('window:setMode', mode),
  collapse: () => ipcRenderer.invoke('window:collapse'),
  expand: () => ipcRenderer.invoke('window:expand'),
  hideWindow: () => ipcRenderer.invoke('window:hide'),
  showWindow: () => ipcRenderer.invoke('window:show'),
  quit: () => ipcRenderer.invoke('window:quit'),

  generateSchedule: (payload) => ipcRenderer.invoke('scheduler:generate', payload),
  reflowSchedule: (payload) => ipcRenderer.invoke('scheduler:reflow', payload),
  updateBlockStatus: (payload) => ipcRenderer.invoke('scheduler:updateBlockStatus', payload),

  addExam: (exam) => ipcRenderer.invoke('exams:add', exam),
  deleteExam: (id) => ipcRenderer.invoke('exams:delete', id),

  addTodo: (todo) => ipcRenderer.invoke('todos:add', todo),
  updateTodo: (payload) => ipcRenderer.invoke('todos:update', payload),
  reorderTodos: (orderedIds) => ipcRenderer.invoke('todos:reorder', orderedIds),
  deleteTodo: (id) => ipcRenderer.invoke('todos:delete', id),

  saveJournal: (entry) => ipcRenderer.invoke('journal:save', entry),
  saveNote: (note) => ipcRenderer.invoke('notes:save', note),
  deleteNote: (id) => ipcRenderer.invoke('notes:delete', id),
  saveVoiceNote: (note) => ipcRenderer.invoke('voice:save', note),
  interpretVoiceCommand: (transcript) => ipcRenderer.invoke('voice:command', transcript),

  markAttendanceDone: () => ipcRenderer.invoke('attendance:markDone'),
  logPomodoroSession: (session) => ipcRenderer.invoke('pomodoro:logSession', session),

  askCoach: (question) => ipcRenderer.invoke('coach:ask', question),

  exportData: () => ipcRenderer.invoke('data:export'),
  importData: () => ipcRenderer.invoke('data:import'),

  fireNotification: (title, body) => ipcRenderer.invoke('notify:fire', { title, body }),

  onNotificationFired: (cb) => ipcRenderer.on('notification:fired', (_e, payload) => cb(payload)),
  onDataRestored: (cb) => ipcRenderer.on('data:restored', (_e, payload) => cb(payload)),
  onQuickAddShortcut: (cb) => ipcRenderer.on('shortcut:quickAdd', () => cb())
});
