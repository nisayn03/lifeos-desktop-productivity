// components/scheduler/scheduler.js
//
// Builds today's timeline from the real weekly timetable + fixed
// after-college routine (database/timetable-data.js), then applies
// rule-based reprioritization: exams near -> more revision, deadlines close
// -> assignments prioritized, placement prep active -> more DSA/Aptitude/
// mock interviews. Falls back cleanly if an OpenAI-compatible endpoint is
// configured but unreachable.

const { getClassBlocksFor, AFTER_COLLEGE_ROUTINE, FACE_ATTENDANCE_TIME, DAY_NAMES } = require('../../database/timetable-data');

function toMinutes(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
function toHHMM(mins) {
  mins = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}
function id() { return 'b_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

/**
 * profile: { wakeUp, sleep, goals, placementPrepActive }
 * exams: [{ subject, date }]
 * deadlines: [{ title, dueDate, subject }]
 * dayOverride: optional day name for testing ('monday' etc.); defaults to today
 */
function buildSchedule(profile = {}, exams = [], deadlines = [], dayOverride = null) {
  const dayName = dayOverride || DAY_NAMES[new Date().getDay()];
  const wake = toMinutes(profile.wakeUp || '07:00');
  const sleep = toMinutes(profile.sleep || '23:00');
  const classBlocks = getClassBlocksFor(dayName);

  const blocks = [];
  const push = (title, start, end, category = 'routine', extra = {}) =>
    blocks.push({ id: id(), title, start: toHHMM(start), end: toHHMM(end), category, status: 'upcoming', ...extra });

  push('Wake Up', wake, wake + 5, 'routine');

  const firstClassStart = classBlocks.length ? toMinutes(classBlocks[0].start) : wake + 180;
  push('Morning Routine', wake + 5, firstClassStart - 45, 'routine');
  push('Breakfast', firstClassStart - 45, firstClassStart - 15, 'routine');
  if (firstClassStart - 15 > wake + 5) push('Commute / Prep', firstClassStart - 15, firstClassStart, 'routine');

  if (classBlocks.length) {
    for (const c of classBlocks) {
      blocks.push({ id: id(), title: c.title, start: c.start, end: c.end, category: c.category, status: 'upcoming' });
    }
  } else {
    push('No classes today — flex study block', firstClassStart, firstClassStart + 180, 'study');
  }

  // Lay in the fixed after-college routine, then reweight the study blocks
  // inside it based on exams / deadlines / placement prep.
  let routine = AFTER_COLLEGE_ROUTINE.map(b => ({ ...b }));
  routine = reprioritize(routine, exams, deadlines, profile);

  for (const r of routine) {
    if (r.category === 'reminder') continue; // handled by notifications, not a timeline block
    blocks.push({ id: id(), title: r.title, start: r.start, end: r.end, category: r.category, status: 'upcoming', subject: r.subject });
  }

  // Face attendance is a notification anchor, not a visible timeline block —
  // handled by components/notifications/notifications.js using FACE_ATTENDANCE_TIME.
  return { blocks, faceAttendanceTime: FACE_ATTENDANCE_TIME, dayName };
}

/**
 * Rule-based reweighting of the evening study blocks:
 *  - exam within 3 days on subject X -> extend Revision, shrink Assignments
 *  - deadline due within 24h -> extend Assignments, shrink Revision
 *  - placementPrepActive -> DSA and Aptitude get extra time at the expense
 *    of the least-loaded existing block
 * All shifts are done in whole-block minute swaps so the day's total length
 * never changes and Sleep never moves.
 */
function reprioritize(routine, exams, deadlines, profile) {
  const now = new Date();
  const soonExam = (exams || []).find(e => {
    const days = Math.ceil((new Date(e.date) - now) / 86400000);
    return days >= 0 && days <= 3;
  });
  const urgentDeadline = (deadlines || []).some(d => {
    const hours = (new Date(d.dueDate) - now) / 3600000;
    return hours >= 0 && hours <= 24;
  });

  // Transfers `minutes` from block `fromTitle` to block `toTitle`, whichever
  // order they actually appear in the routine, as long as they're adjacent —
  // this keeps the day's total length exactly fixed and never opens a gap.
  const shift = (fromTitle, toTitle, minutes) => {
    const from = routine.find(r => r.title === fromTitle);
    const to = routine.find(r => r.title === toTitle);
    if (!from || !to) return;
    const fromLen = toMinutes(from.end) - toMinutes(from.start);
    if (fromLen - minutes < 30) return; // never shrink a block below 30 min

    const fromIdx = routine.indexOf(from);
    const toIdx = routine.indexOf(to);

    if (toIdx === fromIdx - 1 && to.end === from.start) {
      // `to` sits immediately before `from`: grow to's end, shrink from's start
      to.end = toHHMM(toMinutes(to.end) + minutes);
      from.start = toHHMM(toMinutes(from.start) + minutes);
    } else if (toIdx === fromIdx + 1 && to.start === from.end) {
      // `to` sits immediately after `from`: shrink from's end, grow to's start
      from.end = toHHMM(toMinutes(from.end) - minutes);
      to.start = toHHMM(toMinutes(to.start) - minutes);
    }
    // if they aren't adjacent, skip rather than risk creating a gap or overlap
  };

  if (soonExam) shift('Assignments', 'Revision', 20);
  if (urgentDeadline) shift('Revision', 'Assignments', 20);
  if (profile.placementPrepActive) {
    // Give DSA and Aptitude a little more room by trimming Projects/FSD,
    // reflecting "increase DSA/Aptitude/mock interviews" during placement prep.
    // DSA and Projects aren't adjacent (Aptitude sits between them), so this
    // has to go through Aptitude in two chained, adjacency-safe shifts rather
    // than touching DSA and Projects directly — otherwise Aptitude gets
    // stranded with a gap on one side and an overlap on the other.
    shift('Projects / Full Stack Development', 'Aptitude', 20); // Aptitude +20, Projects -20
    shift('Aptitude', 'DSA', 10);                                // DSA +10, Aptitude -10 (net Aptitude +10)
  }

  return routine;
}

/** Optional OpenAI-compatible AI pass. Falls back to buildSchedule() on any failure. */
async function buildScheduleWithAI(profile, exams, deadlines, aiConfig) {
  if (!aiConfig || !aiConfig.baseUrl || !aiConfig.apiKey) return buildSchedule(profile, exams, deadlines);
  try {
    const base = buildSchedule(profile, exams, deadlines);
    const prompt = `Given this base daily schedule (fixed college classes + routine) and this ` +
      `context (exams: ${JSON.stringify(exams)}, deadlines: ${JSON.stringify(deadlines)}, ` +
      `placementPrepActive: ${!!profile.placementPrepActive}), suggest ONLY minor timing tweaks to the ` +
      `non-college blocks as a JSON array [{"title":str,"start":"HH:MM","end":"HH:MM"}]. ` +
      `Base schedule: ${JSON.stringify(base.blocks)}`;

    const res = await fetch(`${aiConfig.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aiConfig.apiKey}` },
      body: JSON.stringify({ model: aiConfig.model || 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.3 })
    });
    if (!res.ok) throw new Error(`AI scheduler HTTP ${res.status}`);
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const tweaks = JSON.parse(cleaned);
    if (!Array.isArray(tweaks)) throw new Error('malformed AI response');

    const merged = base.blocks.map(b => {
      const t = tweaks.find(x => x.title === b.title);
      return t ? { ...b, start: t.start, end: t.end } : b;
    });
    return { ...base, blocks: merged };
  } catch (err) {
    console.warn('[scheduler] AI pass failed, using rule-based schedule:', err.message);
    return buildSchedule(profile, exams, deadlines);
  }
}

/** Reflow remaining (not-yet-started, not-completed) blocks after a miss, keeping Sleep fixed. */
function reflow(blocks, fromTime, deltaMinutes) {
  const fromMin = toMinutes(fromTime);
  return blocks.map(b => {
    if (toMinutes(b.start) < fromMin || b.status === 'completed' || /sleep/i.test(b.title)) return b;
    return { ...b, start: toHHMM(toMinutes(b.start) + deltaMinutes), end: toHHMM(toMinutes(b.end) + deltaMinutes) };
  });
}

module.exports = { buildSchedule, buildScheduleWithAI, reflow, toMinutes, toHHMM };
