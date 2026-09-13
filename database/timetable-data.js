// database/timetable-data.js
//
// The user's actual weekly timetable and after-college routine, used as the
// default seed for the scheduler. Editable later from the dashboard — this
// file just makes sure day-one output is correct instead of a generic
// placeholder schedule.

const TIMETABLE = {
  monday: [
    ['08:00', '08:50', 'Computer Networks'],
    ['08:50', '09:40', 'Automata Theory & Compiler Design'],
    ['10:00', '10:50', 'Renewable Energy Sources'],
    ['10:50', '11:40', 'Full Stack Development'],
    ['13:00', '13:50', 'Flutter (UIDF)'],
    ['13:50', '14:40', 'Object Oriented Analysis & Design'],
    ['14:40', '15:30', 'Advanced Java']
  ],
  tuesday: [
    ['08:00', '08:50', 'Advanced Java'],
    ['08:50', '11:40', 'Advanced Java Lab / Computer Networks Lab'],
    ['13:00', '13:50', 'Full Stack Development'],
    ['13:50', '14:40', 'Computer Networks'],
    ['14:40', '15:30', 'Automata Theory & Compiler Design']
  ],
  wednesday: [
    ['08:00', '08:50', 'Flutter'],
    ['08:50', '09:40', 'Full Stack Development'],
    ['10:00', '10:50', 'Renewable Energy Sources'],
    ['10:50', '11:40', 'Automata Theory & Compiler Design'],
    ['13:00', '13:50', 'Object Oriented Analysis & Design'],
    ['13:50', '14:40', 'Advanced Java'],
    ['14:40', '15:30', 'Computer Networks']
  ],
  thursday: [
    ['08:00', '08:50', 'Object Oriented Analysis & Design'],
    ['08:50', '11:40', 'Full Stack Development / Flutter Lab'],
    ['13:00', '13:50', 'Computer Networks'],
    ['13:50', '14:40', 'Automata Theory & Compiler Design'],
    ['14:40', '15:30', 'Flutter']
  ],
  friday: [
    ['08:00', '08:50', 'Computer Networks'],
    ['08:50', '09:40', 'Advanced Java'],
    ['10:00', '10:50', 'Full Stack Development'],
    ['10:50', '11:40', 'Object Oriented Analysis & Design'],
    ['13:00', '14:40', 'Flutter / Full Stack Development Lab']
  ],
  saturday: [
    ['08:00', '08:50', 'Automata Theory & Compiler Design'],
    ['08:50', '09:40', 'Renewable Energy Sources'],
    ['10:00', '10:50', 'Advanced Java'],
    ['10:50', '11:40', 'Counselling'],
    ['13:00', '15:30', 'Computer Networks Lab / Advanced Java Lab']
  ],
  sunday: []
};

const LUNCH_BLOCK = { start: '11:40', end: '13:00', title: 'Lunch' };

// Fixed after-college routine — laid in immediately after the last class of
// the day (or from 15:30 on days with no afternoon lab), independent of
// subject load. The AI scheduler is still free to compress/expand the study
// blocks inside it based on exams, deadlines, and placement prep — see
// components/scheduler/scheduler.js.
const AFTER_COLLEGE_ROUTINE = [
  { start: '15:30', end: '16:30', title: 'Break — mess, snacks, water, personal time', category: 'break' },
  { start: '16:30', end: '18:00', title: 'DSA', category: 'study', subject: 'DSA' },
  { start: '18:00', end: '19:00', title: 'Aptitude', category: 'study', subject: 'Aptitude' },
  { start: '19:00', end: '20:00', title: 'Projects / Full Stack Development', category: 'study', subject: 'Full Stack Development' },
  { start: '20:00', end: '20:30', title: 'Dinner', category: 'routine' },
  { start: '20:30', end: '21:30', title: 'Revision', category: 'study' },
  { start: '21:30', end: '22:30', title: 'Assignments', category: 'study' },
  { start: '22:30', end: '23:00', title: 'Prepare tomorrow', category: 'routine' },
  { start: '23:00', end: '23:05', title: 'Sleep', category: 'routine' }
];

// Fires as a notification, not a timeline block (0-duration marker).
const FACE_ATTENDANCE_TIME = '18:00';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Returns [{start,end,title,category:'college'}] for a given day name, lunch included when the day's classes span it. */
function getClassBlocksFor(dayName) {
  const classes = TIMETABLE[dayName] || [];
  if (!classes.length) return [];
  const blocks = classes.map(([start, end, title]) => ({ start, end, title, category: 'college' }));
  const spansLunch = classes.some(([start]) => start < '13:00') && classes.some(([, end]) => end > '11:40');
  if (spansLunch) {
    const insertAt = blocks.findIndex(b => b.start >= '13:00');
    blocks.splice(insertAt === -1 ? blocks.length : insertAt, 0, { ...LUNCH_BLOCK, category: 'routine' });
  }
  return blocks;
}

function lastClassEndTime(dayName) {
  const classes = TIMETABLE[dayName] || [];
  if (!classes.length) return null;
  return classes.reduce((latest, [, end]) => (end > latest ? end : latest), '00:00');
}

module.exports = {
  TIMETABLE,
  AFTER_COLLEGE_ROUTINE,
  FACE_ATTENDANCE_TIME,
  DAY_NAMES,
  getClassBlocksFor,
  lastClassEndTime
};
