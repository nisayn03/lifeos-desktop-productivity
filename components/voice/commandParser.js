// components/voice/commandParser.js
function parseTime(hourStr, minStr, ampm) {
  let hour = parseInt(hourStr, 10);
  const min = minStr ? parseInt(minStr.replace(':', ''), 10) : 0;
  if (ampm === 'pm' && hour < 12) hour += 12;
  if (ampm === 'am' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function interpret(transcript) {
  const t = transcript.toLowerCase().trim();

  let m = t.match(/add (.+?) (today|tomorrow)$/);
  if (m) return { action: 'addTask', title: m[1].trim(), when: m[2] };

  m = t.match(/add (.+?) at (\d{1,2})(:\d{2})?\s*(am|pm)?/);
  if (m) return { action: 'addTaskAt', title: m[1].trim(), time: parseTime(m[2], m[3], m[4]) };

  m = t.match(/move (.+?) to (\d{1,2})(:\d{2})?\s*(am|pm)?/);
  if (m) return { action: 'shiftTask', title: m[1].trim(), time: parseTime(m[2], m[3], m[4]) };

  m = t.match(/shift (.+?) to (\d{1,2})(:\d{2})?\s*(am|pm)?/);
  if (m) return { action: 'shiftTask', title: m[1].trim(), time: parseTime(m[2], m[3], m[4]) };

  m = t.match(/remind me to (.+)/);
  if (m) return { action: 'addReminder', title: m[1].trim() };

  if (/what.?s next/.test(t)) return { action: 'queryNext' };
  if (/finish this task|mark.*(task)?.*(complete|completed|done)/.test(t)) return { action: 'markCurrentComplete' };

  return { action: 'unknown', raw: transcript };
}

module.exports = { interpret };
