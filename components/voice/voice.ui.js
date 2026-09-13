// components/voice/voice.ui.js
import { AppState } from '../state/appState.js';
import { Timeline } from '../timeline/timeline.ui.js';
import { Todo } from '../todo/todo.ui.js';

export const Voice = {
  recognition: null,
  listening: false,

  init() {
    const micBtn = document.getElementById('micBtn');
    micBtn.addEventListener('click', () => this.toggleListening());

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[voice] Web Speech API not available in this build of Chromium.');
      return;
    }
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';
    this.recognition.onresult = (event) => this.handleTranscript(event.results[0][0].transcript);
    this.recognition.onend = () => { this.listening = false; micBtn.style.color = ''; };
    this.recognition.onerror = (e) => { console.warn('[voice] recognition error:', e.error); this.listening = false; };
  },

  toggleListening() {
    if (!this.recognition) {
      const micBtn = document.getElementById('micBtn');
      micBtn.title = 'Voice recognition isn\u2019t available on this system/build of Electron.';
      micBtn.style.color = 'var(--accent-red)';
      setTimeout(() => { micBtn.style.color = ''; }, 2000);
      return;
    }
    if (this.listening) { this.recognition.stop(); return; }
    this.listening = true;
    document.getElementById('micBtn').style.color = 'var(--accent-amber)';
    this.recognition.start();
  },

  async handleTranscript(transcript) {
    await window.lifeos.saveVoiceNote({ transcript });
    const result = await window.lifeos.interpretVoiceCommand(transcript);

    switch (result.action) {
      case 'addTask':
      case 'addTaskAt': {
        const deadline = result.when === 'tomorrow' ? tomorrowDate() : (result.when === 'today' ? todayDate() : null);
        const todo = await window.lifeos.addTodo({ title: result.title, priority: 'medium', category: 'Personal', deadline });
        AppState.data.todos.push(todo);
        Todo.render();
        this.speak(result.time ? `Added ${result.title} at ${result.time}.` : `Added ${result.title}.`);
        break;
      }
      case 'addReminder': {
        const todo = await window.lifeos.addTodo({ title: result.title, priority: 'medium', category: 'Personal', deadline: todayDate() });
        AppState.data.todos.push(todo);
        Todo.render();
        this.speak(`I\u2019ll remind you to ${result.title}.`);
        break;
      }
      case 'shiftTask':
        this.speak(`Shifting ${result.title} to ${result.time}.`);
        break;
      case 'queryNext': {
        const timeline = AppState.get('timeline') || [];
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        const next = timeline.find(b => Timeline.toMinutes(b.start) > nowMin);
        this.speak(next ? `Next up: ${next.title} at ${next.start}.` : 'Nothing else scheduled today.');
        break;
      }
      case 'markCurrentComplete': {
        const timeline = AppState.get('timeline') || [];
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        const current = timeline.find(b => Timeline.computeStatus(b, nowMin) === 'current');
        if (current) { await Timeline.markComplete(current.id); this.speak(`Marked ${current.title} as complete.`); }
        else this.speak('Nothing is currently in progress.');
        break;
      }
      default:
        this.speak('Saved as a voice note. I didn\u2019t recognize that as a command.');
    }
  },

  speak(text) {
    if (!AppState.get('settings.ttsEnabled')) return;
    if (!window.speechSynthesis) return;
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }
};

function todayDate() { return new Date().toISOString().slice(0, 10); }
function tomorrowDate() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }
