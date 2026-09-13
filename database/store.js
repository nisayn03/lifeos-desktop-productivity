// database/store.js
// Local-first JSON database. One file on disk under Electron's userData
// folder; every "table" is a top-level key. Writes are atomic (write to a
// temp file, then rename) so a crash mid-save can never corrupt the file.

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULT_DATA = {
  meta: { createdAt: null, version: 2 },
  windowState: { x: null, y: null, mode: 'collapsed' },
  settings: {
    theme: 'glass',
    accentColor: '#F2A93B',
    transparency: 0.72,
    fontSize: 'medium',
    animations: true,
    animationSpeed: 1,
    notificationSounds: true,
    voiceEnabled: true,
    ttsEnabled: false,
    autosave: true,
    autoLaunch: false,
    widgetSize: 'medium',
    aiBaseUrl: '',
    aiApiKey: '',
    aiModel: ''
  },
  profile: {
    wakeUp: '07:00',
    sleep: '23:00',
    goals: [],
    placementPrepActive: false
  },
  exams: [],       // { id, subject, date }
  timeline: [],    // today's generated schedule blocks
  todos: [],       // { id, title, description, category, deadline, priority, notes, progress, attachments, reminder, recurring, order, done }
  deadlines: [],
  notes: [],
  voiceNotes: [],
  journal: [],
  pomodoro: { sessions: [], streak: 0 },
  analytics: { studyHoursByDay: {}, subjectMinutes: {} },
  attendance: { lastMarkedDate: null },
  petState: { mood: 'idle', lastFedAt: null, treatsCaught: 0 },
  history: []
};

class Store {
  constructor() {
    this.dir = app.getPath('userData');
    this.file = path.join(this.dir, 'lifeos-data.json');
    this.tmpFile = this.file + '.tmp';
    this.data = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.file)) {
        const raw = fs.readFileSync(this.file, 'utf-8');
        const parsed = JSON.parse(raw);
        return deepMerge(structuredClone(DEFAULT_DATA), parsed);
      }
    } catch (err) {
      console.error('[store] read failed, backing up and starting fresh:', err);
      try {
        if (fs.existsSync(this.file)) fs.copyFileSync(this.file, `${this.file}.corrupt-${Date.now()}.bak`);
      } catch (_) { /* best effort */ }
    }
    const fresh = structuredClone(DEFAULT_DATA);
    fresh.meta.createdAt = new Date().toISOString();
    return fresh;
  }

  save() {
    try {
      if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
      fs.writeFileSync(this.tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(this.tmpFile, this.file);
      return true;
    } catch (err) {
      console.error('[store] save failed:', err);
      return false;
    }
  }

  get(keyPath) {
    return keyPath.split('.').reduce((o, k) => (o == null ? undefined : o[k]), this.data);
  }

  set(keyPath, value) {
    const keys = keyPath.split('.');
    let obj = this.data;
    for (let i = 0; i < keys.length - 1; i++) {
      if (obj[keys[i]] == null) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    this.save();
    return value;
  }

  all() { return this.data; }

  exportSnapshot(destPath) {
    fs.writeFileSync(destPath, JSON.stringify(this.data, null, 2), 'utf-8');
    return destPath;
  }

  importSnapshot(srcPath) {
    const parsed = JSON.parse(fs.readFileSync(srcPath, 'utf-8'));
    this.data = deepMerge(structuredClone(DEFAULT_DATA), parsed);
    this.save();
    return this.data;
  }
}

function deepMerge(base, incoming) {
  for (const key of Object.keys(incoming || {})) {
    if (incoming[key] && typeof incoming[key] === 'object' && !Array.isArray(incoming[key]) && base[key] && typeof base[key] === 'object') {
      base[key] = deepMerge(base[key], incoming[key]);
    } else {
      base[key] = incoming[key];
    }
  }
  return base;
}

module.exports = { Store, DEFAULT_DATA };
