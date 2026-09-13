// components/pet/pet.ui.js
import { AppState } from '../state/appState.js';

const PET_STATES = {
  idle: '🐣', walking: '🚶', studying: '🧠', reading: '📖', typing: '⌨️',
  sleeping: '😴', eating: '🍙', celebrating: '🎉', thinking: '🤔',
  dragging: '🫳', focus: '🎯', break: '☕'
};

const DEFAULT_MESSAGES = [
  'Breathe in... breathe out.',
  'Drink some water.',
  "Let's finish today's goals.",
  "You've got this.",
  'One task at a time.',
  'Keep coding.',
  'Take care of yourself.'
];

export const Pet = {
  el: null,
  miniEl: null,
  bubble: null,
  state: 'idle',
  customMessages: [],
  walkDir: 1,

  init() {
    this.el = document.getElementById('petBody');
    this.miniEl = document.getElementById('petCollapsed');
    this.bubble = document.getElementById('petBubble');
    this.setState('idle');

    AppState.on('pet:reactTo', (event) => this.reactTo(event));

    let dragging = false, offsetX = 0, offsetY = 0;
    const pet = document.getElementById('pet');
    pet.addEventListener('mousedown', (e) => {
      dragging = true;
      offsetX = e.clientX - pet.offsetLeft;
      offsetY = e.clientY - pet.offsetTop;
      this.reactTo('dragging');
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      pet.style.left = `${e.clientX - offsetX}px`;
      pet.style.top = `${e.clientY - offsetY}px`;
      pet.style.right = 'auto'; pet.style.bottom = 'auto';
    });
    window.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      // gravity: settle back toward the bottom edge
      pet.style.transition = 'top 400ms cubic-bezier(.34,1.56,.64,1)';
      pet.style.top = `${window.innerHeight - 54}px`;
      setTimeout(() => { pet.style.transition = ''; this.setState('idle'); }, 420);
    });

    pet.addEventListener('click', () => this.sayRandom());
    pet.addEventListener('dblclick', () => this.feed());

    setInterval(() => this.wander(), 8000);
    setInterval(() => this.ambientTick(), 5 * 60 * 1000);
    this.ambientTick();
  },

  setState(state) {
    this.state = state;
    const glyph = PET_STATES[state] || PET_STATES.idle;
    this.el.textContent = glyph;
    if (this.miniEl) this.miniEl.textContent = glyph;
  },

  say(text, ms = 3500) {
    this.bubble.textContent = text;
    this.bubble.classList.remove('hidden');
    clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => this.bubble.classList.add('hidden'), ms);
  },

  sayRandom() {
    const pool = [...DEFAULT_MESSAGES, ...this.customMessages];
    this.say(pool[Math.floor(Math.random() * pool.length)]);
  },

  addCustomMessage(text) { this.customMessages.push(text); },

  feed() {
    this.setState('eating');
    this.say('Yum, thanks! 🍪');
    window.lifeos.setData('petState.treatsCaught', (AppState.get('petState.treatsCaught') || 0) + 1);
    setTimeout(() => this.setState('idle'), 2500);
  },

  reactTo(event) {
    switch (event) {
      case 'pomodoroComplete': this.setState('celebrating'); this.say('Nice focus session! 🎉'); setTimeout(() => this.setState('idle'), 4000); break;
      case 'scheduleGenerated': this.setState('thinking'); this.say('Fresh schedule ready.'); setTimeout(() => this.setState('idle'), 3000); break;
      case 'journalSaved': this.setState('reading'); this.say('Logged today\u2019s thoughts.'); setTimeout(() => this.setState('idle'), 3000); break;
      case 'taskCompleted': this.setState('celebrating'); this.say('One down! 🎉'); setTimeout(() => this.setState('idle'), 2500); break;
      case 'dragging': this.setState('dragging'); break;
      default: this.setState('idle');
    }
  },

  /** Gentle side-to-side wander so the pet doesn't look static, turning at edges. */
  wander() {
    const pet = document.getElementById('pet');
    if (this.state !== 'idle' && this.state !== 'walking') return;
    this.setState('walking');
    const rect = pet.getBoundingClientRect();
    const containerWidth = pet.parentElement.clientWidth;
    let left = rect.left - pet.parentElement.getBoundingClientRect().left + this.walkDir * 18;
    if (left <= 8 || left >= containerWidth - 48) this.walkDir *= -1;
    pet.style.transform = `scaleX(${this.walkDir})`;
    setTimeout(() => { if (this.state === 'walking') this.setState('idle'); }, 1200);
  },

  ambientTick() {
    const hour = new Date().getHours();
    if (hour >= 23 || hour < 6) this.setState('sleeping');
    else if (!['celebrating', 'thinking', 'eating'].includes(this.state)) this.setState('studying');
  }
};
