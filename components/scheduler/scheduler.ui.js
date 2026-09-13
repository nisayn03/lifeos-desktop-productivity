// components/scheduler/scheduler.ui.js
import { AppState } from '../state/appState.js';
import { Timeline } from '../timeline/timeline.ui.js';

export const SchedulerUI = {
  init() {
    const form = document.getElementById('plannerForm');
    this.hydrate(form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const profile = {
        wakeUp: fd.get('wakeUp') || '07:00',
        sleep: fd.get('sleep') || '23:00',
        goals: (fd.get('goals') || '').split(',').map(s => s.trim()).filter(Boolean),
        placementPrepActive: fd.get('placementPrepActive') === 'on'
      };
      const blocks = await window.lifeos.generateSchedule({ profile });
      AppState.data.timeline = blocks;
      AppState.data.profile = { ...AppState.data.profile, ...profile };
      Timeline.render();
      AppState.emit('nav:goto', 'timeline');
      AppState.emit('pet:reactTo', 'scheduleGenerated');
    });
  },

  hydrate(form) {
    const profile = AppState.get('profile') || {};
    if (profile.wakeUp) form.elements.wakeUp.value = profile.wakeUp;
    if (profile.sleep) form.elements.sleep.value = profile.sleep;
    if (profile.goals?.length) form.elements.goals.value = profile.goals.join(', ');
    form.elements.placementPrepActive.checked = !!profile.placementPrepActive;
  }
};
