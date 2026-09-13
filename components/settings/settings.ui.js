// components/settings/settings.ui.js
import { AppState } from '../state/appState.js';

export const Settings = {
  init() {
    this.render();
    document.getElementById('exportBtn').addEventListener('click', async () => {
      const path = await window.lifeos.exportData();
      if (path) window.lifeos.fireNotification('Backup saved', path);
    });
    document.getElementById('importBtn').addEventListener('click', async () => {
      const data = await window.lifeos.importData();
      if (data) { AppState.data = data; location.reload(); }
    });
  },

  async setSetting(key, value) {
    await AppState.set(`settings.${key}`, value);
    this.applyLive(key, value);
  },

  applyLive(key, value) {
    if (key === 'theme') document.body.dataset.theme = value;
    if (key === 'animations') document.body.classList.toggle('animations-off', !value);
    if (key === 'fontSize') {
      const scale = { small: 0.9, medium: 1, large: 1.15 }[value] || 1;
      document.documentElement.style.setProperty('--font-scale', scale);
    }
    if (key === 'accentColor') document.documentElement.style.setProperty('--accent-amber', value);
  },

  render() {
    const grid = document.getElementById('settingsGrid');
    const s = AppState.get('settings') || {};

    grid.innerHTML = `
      <div class="setting-row"><label>Theme</label>
        <select class="theme-select" id="setTheme">
          ${['glass', 'dark', 'light', 'cyberpunk', 'pastel', 'minimal'].map(t => `<option value="${t}" ${s.theme === t ? 'selected' : ''}>${t[0].toUpperCase() + t.slice(1)}</option>`).join('')}
        </select>
      </div>
      <div class="setting-row"><label>Accent color</label><input type="color" class="accent-picker" id="setAccent" value="${s.accentColor || '#F2A93B'}" /></div>
      <div class="setting-row"><label>Transparency</label><input type="range" id="setTransparency" min="0.4" max="0.95" step="0.01" value="${s.transparency ?? 0.72}" /></div>
      <div class="setting-row"><label>Font size</label>
        <select class="theme-select" id="setFontSize">
          ${['small', 'medium', 'large'].map(f => `<option value="${f}" ${s.fontSize === f ? 'selected' : ''}>${f}</option>`).join('')}
        </select>
      </div>
      <div class="setting-row"><label>Widget size</label>
        <select class="theme-select" id="setWidgetSize">
          ${['small', 'medium', 'large'].map(w => `<option value="${w}" ${s.widgetSize === w ? 'selected' : ''}>${w}</option>`).join('')}
        </select>
      </div>
      <div class="setting-row"><label>Animations</label><button class="switch ${s.animations ? 'on' : ''}" data-key="animations"></button></div>
      <div class="setting-row"><label>Notification sounds</label><button class="switch ${s.notificationSounds ? 'on' : ''}" data-key="notificationSounds"></button></div>
      <div class="setting-row"><label>Voice assistant</label><button class="switch ${s.voiceEnabled ? 'on' : ''}" data-key="voiceEnabled"></button></div>
      <div class="setting-row"><label>Read reminders aloud (TTS)</label><button class="switch ${s.ttsEnabled ? 'on' : ''}" data-key="ttsEnabled"></button></div>
      <div class="setting-row"><label>Autosave</label><button class="switch ${s.autosave ? 'on' : ''}" data-key="autosave"></button></div>
      <div class="setting-row"><label>Launch at login</label><button class="switch ${s.autoLaunch ? 'on' : ''}" data-key="autoLaunch"></button></div>
      <div class="setting-row" style="flex-direction:column;align-items:stretch;gap:6px;">
        <label>AI base URL (optional, OpenAI-compatible)</label>
        <input type="text" id="setAiBaseUrl" placeholder="https://api.openai.com/v1" value="${s.aiBaseUrl || ''}" />
      </div>
      <div class="setting-row" style="flex-direction:column;align-items:stretch;gap:6px;">
        <label>AI API key</label>
        <input type="password" id="setAiApiKey" value="${s.aiApiKey || ''}" />
      </div>
    `;

    document.getElementById('setTheme').addEventListener('change', (e) => this.setSetting('theme', e.target.value));
    document.getElementById('setAccent').addEventListener('input', (e) => this.setSetting('accentColor', e.target.value));
    document.getElementById('setFontSize').addEventListener('change', (e) => this.setSetting('fontSize', e.target.value));
    document.getElementById('setWidgetSize').addEventListener('change', (e) => this.setSetting('widgetSize', e.target.value));
    document.getElementById('setTransparency').addEventListener('input', (e) => this.setSetting('transparency', parseFloat(e.target.value)));
    document.getElementById('setAiBaseUrl').addEventListener('change', (e) => this.setSetting('aiBaseUrl', e.target.value));
    document.getElementById('setAiApiKey').addEventListener('change', (e) => this.setSetting('aiApiKey', e.target.value));

    grid.querySelectorAll('.switch').forEach(sw => {
      sw.addEventListener('click', () => {
        const key = sw.dataset.key;
        const next = !sw.classList.contains('on');
        sw.classList.toggle('on', next);
        this.setSetting(key, next);
      });
    });

    // apply persisted look on load
    this.applyLive('fontSize', s.fontSize || 'medium');
    this.applyLive('accentColor', s.accentColor || '#F2A93B');
    if (s.animations === false) document.body.classList.add('animations-off');
  }
};
