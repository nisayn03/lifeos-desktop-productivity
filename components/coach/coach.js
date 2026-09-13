// components/coach/coach.js
//
// Rule-based answers to the specific coach questions the spec calls out,
// computed directly from store data so they're accurate with zero API calls.
// Anything that doesn't match a known question pattern optionally goes to
// an OpenAI-compatible endpoint if configured; otherwise it gets a plain
// "I can answer X, Y, Z today" fallback rather than a made-up answer.

function minutesLeftToday() {
  const now = new Date();
  return 1440 - (now.getHours() * 60 + now.getMinutes());
}

function summarize(store) {
  const timeline = store.get('timeline') || [];
  const todos = store.get('todos') || [];
  const deadlines = store.get('deadlines') || [];
  const exams = store.get('exams') || [];
  const pomodoro = store.get('pomodoro') || { sessions: [] };
  const now = new Date();

  const todayKey = now.toDateString();
  const completedToday = timeline.filter(b => b.status === 'completed').length;
  const missedToday = timeline.filter(b => b.status === 'missed').length;
  const remainingBlocks = timeline.filter(b => b.status === 'upcoming' || b.status === 'current');
  const remainingMinutes = remainingBlocks.reduce((sum, b) => {
    const [sh, sm] = b.start.split(':').map(Number);
    const [eh, em] = b.end.split(':').map(Number);
    return sum + ((eh * 60 + em) - (sh * 60 + sm));
  }, 0);

  const pendingTodos = todos.filter(t => !t.done);
  const overdueTodos = pendingTodos.filter(t => t.deadline && new Date(t.deadline) < now);
  const upcomingDeadlines = [...todos.filter(t => t.deadline && !t.done), ...deadlines]
    .map(d => ({ title: d.title, date: d.deadline || d.date }))
    .filter(d => d.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  const focusToday = (pomodoro.sessions || []).filter(s => new Date(s.completedAt).toDateString() === todayKey && s.type === 'focus').length;

  const subjectMinutes = {};
  for (const t of todos) {
    if (t.category) subjectMinutes[t.category] = (subjectMinutes[t.category] || 0) + (t.done ? 0 : 1);
  }
  const neediestSubject = Object.entries(subjectMinutes).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return { completedToday, missedToday, remainingMinutes, pendingTodos, overdueTodos, upcomingDeadlines, focusToday, neediestSubject, exams };
}

function answer(question, store) {
  const q = question.toLowerCase();
  const s = summarize(store);

  if (/what should i do next/.test(q)) {
    const timeline = store.get('timeline') || [];
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
    const current = timeline.find(b => toMin(b.start) <= nowMin && nowMin < toMin(b.end) && b.status !== 'completed' && b.status !== 'missed');
    if (current) return `Right now: ${current.title} (until ${current.end}).`;
    const next = timeline.find(b => toMin(b.start) > nowMin && b.status !== 'completed' && b.status !== 'missed');
    return next ? `Nothing scheduled this exact minute — next up is ${next.title} at ${next.start}.` : 'Nothing left on today\u2019s timeline.';
  }

  if (/can i finish today/.test(q)) {
    const hoursLeft = minutesLeftToday() / 60;
    const hoursNeeded = s.remainingMinutes / 60;
    return hoursNeeded <= hoursLeft
      ? `Yes — ${hoursNeeded.toFixed(1)}h of scheduled work left and ${hoursLeft.toFixed(1)}h left in the day.`
      : `It's tight: ${hoursNeeded.toFixed(1)}h scheduled but only ${hoursLeft.toFixed(1)}h left today. Consider trimming or pushing the lowest-priority block.`;
  }

  if (/which subject needs attention/.test(q)) {
    return s.neediestSubject
      ? `${s.neediestSubject} has the most pending tasks right now.`
      : 'No category is clearly behind — nice and balanced today.';
  }

  if (/how productive was i today/.test(q)) {
    return `${s.completedToday} block${s.completedToday === 1 ? '' : 's'} completed, ${s.missedToday} missed, ${s.focusToday} focus session${s.focusToday === 1 ? '' : 's'} logged.`;
  }

  if (/what should i postpone/.test(q)) {
    const lowest = s.pendingTodos.filter(t => t.priority === 'low')[0];
    return lowest ? `"${lowest.title}" is low priority with no urgent deadline — safest to push.` : 'Nothing obviously postponable — everything pending looks meaningful.';
  }

  if (/how much free time/.test(q)) {
    const free = Math.max(minutesLeftToday() - s.remainingMinutes, 0);
    return `About ${(free / 60).toFixed(1)}h of unscheduled time left today.`;
  }

  if (/upcoming deadlines/.test(q)) {
    return s.upcomingDeadlines.length
      ? s.upcomingDeadlines.map(d => `${d.title} — ${new Date(d.date).toLocaleDateString()}`).join('; ')
      : 'No deadlines on file.';
  }

  if (/placement/.test(q)) {
    const active = store.get('profile.placementPrepActive');
    return active
      ? 'Placement prep is active — DSA and Aptitude are getting extra time in your evening schedule.'
      : 'Placement prep isn\u2019t marked active yet — turn it on in the AI Planner to weight DSA/Aptitude/mock interviews higher.';
  }

  return null; // no rule matched — caller may fall back to an LLM or a generic message
}

async function answerWithAI(question, store, aiConfig) {
  const ruleBased = answer(question, store);
  if (ruleBased) return ruleBased;
  if (!aiConfig || !aiConfig.baseUrl || !aiConfig.apiKey) {
    return "I can answer questions about what's next, today's progress, deadlines, free time, and placement prep directly. For anything else, add an AI key in Settings.";
  }
  try {
    const s = summarize(store);
    const prompt = `You are a terse productivity coach. Context: ${JSON.stringify(s)}. Question: ${question}. Answer in 1-2 sentences.`;
    const res = await fetch(`${aiConfig.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aiConfig.apiKey}` },
      body: JSON.stringify({ model: aiConfig.model || 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.4 })
    });
    if (!res.ok) throw new Error(`coach HTTP ${res.status}`);
    const json = await res.json();
    return json.choices?.[0]?.message?.content?.trim() || 'No response from the AI model.';
  } catch (err) {
    console.warn('[coach] AI fallback failed:', err.message);
    return "I couldn't reach the AI model, but I can still answer questions about today's schedule, deadlines, and progress directly.";
  }
}

module.exports = { answer, answerWithAI, summarize };
