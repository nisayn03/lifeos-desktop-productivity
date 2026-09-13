// components/state/appState.js
export const AppState = {
  data: null,

  async load() {
    this.data = await window.lifeos.getAllData();
    return this.data;
  },

  get(keyPath) {
    return keyPath.split('.').reduce((o, k) => (o == null ? undefined : o[k]), this.data);
  },

  async set(keyPath, value) {
    await window.lifeos.setData(keyPath, value);
    const keys = keyPath.split('.');
    let obj = this.data;
    for (let i = 0; i < keys.length - 1; i++) {
      if (obj[keys[i]] == null) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
  },

  listeners: {},
  on(event, cb) { (this.listeners[event] = this.listeners[event] || []).push(cb); },
  emit(event, payload) { (this.listeners[event] || []).forEach(cb => cb(payload)); }
};

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
