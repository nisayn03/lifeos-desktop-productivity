# LifeOS — AI Productivity Desktop Widget with Virtual Companion

## Run it

```bash
npm install
npm run generate-assets   # creates placeholder pet/UI PNGs (crude — see below)
npm start
```

Package an installer:
```bash
npm run build:win
npm run build:mac
```

Requires Node 18+ and internet access for `npm install` (Electron is a
~200MB download). **Neither `npm install` nor `npm start` has been run** —
there is no network access or display in the environment this was built in.
Everything below explains exactly what was and wasn't verified, and how.

## How this was actually verified, given those constraints

I couldn't launch Electron, so I couldn't watch it run. What I *could* do,
and did:

- **Every cross-file reference checked programmatically**, not just read by
  eye: every `getElementById` call in the renderer diffed against every `id`
  in `index.html`; every `window.lifeos.*` call diffed against what
  `preload.js` actually exposes; every `ipcMain.handle` channel diffed
  against every `ipcRenderer.invoke` call (all match, both directions,
  confirmed by set difference, not inspection); every ES module `import`
  resolved against the target file's actual `export`s; every CommonJS
  `require()`/destructure resolved against the target's `module.exports`.
- **The pure logic modules (scheduler, coach, notifications, store) actually
  executed in Node**, not just read — these don't depend on Electron's GUI,
  so I stubbed `electron` where needed and ran them for real: generated a
  full day's schedule for all 7 timetable days, checked for gaps/overlaps
  programmatically, round-tripped the store through save→corrupt→recover,
  and ran every AI Coach question against mock data.
- **This caught three real bugs, now fixed**:
  1. `windowManager.setMode()` would drift the window down the screen a
     little further on every redundant collapse/expand call — fixed to only
     apply the position offset on an actual mode change, plus added
     screen-bounds clamping.
  2. The exam-based reprioritizer (`shift()` in `scheduler.js`) silently
     failed in one direction — when an exam was near, Revision was supposed
     to grow and Assignments shrink, but the adjacency check only worked for
     the reverse case, leaving a 20-minute gap instead of actually
     reprioritizing. Fixed and confirmed numerically: Revision now correctly
     grows 60→80 min with zero gap.
  3. The placement-prep reweighting touched DSA and Projects directly even
     though Aptitude sits between them, which created a genuine 15-minute
     **overlap** between DSA and Aptitude and a 15-minute gap before
     Projects. Fixed by chaining two adjacency-safe shifts through Aptitude
     instead; confirmed DSA/Aptitude/Projects are now fully contiguous.
  4. (Coach) "What should I do next?" could return a task already marked
     completed, because the fallback search checked only start time, not
     status. Fixed and confirmed.

What this rules out: typos, broken imports, mismatched IPC channels, and
logic bugs in anything that doesn't require a real window. What it does
**not** rule out: anything specific to Electron's actual window/rendering
behavior — transparency compositing, the frameless drag region, whether the
CSS glassmorphism blur looks right, whether `setBounds` animates smoothly,
whether Web Speech API is available on your build of Chromium, whether
`electron-builder` actually produces a working installer. Those need one
real `npm start` on your machine, and I'd genuinely expect a few small fixes
after that first run — that's normal for any app's first launch, Electron or
otherwise, and no amount of static review substitutes for it.

## What's implemented

Window behavior (frameless/transparent/always-on-top/resizable/position
memory/auto-hide), Home dashboard, timetable-driven Timeline with live
glow states, To-Do with drag-and-drop reordering, Deadlines
(today/tomorrow/week/upcoming/overdue), Exams (feeds the reprioritizer),
Pomodoro (25/5, 50/10, 90/20, custom), Notes with search/pin, nightly
Journal, Calendar, weekly Analytics, AI Productivity Coach (8 rule-based
question types + optional LLM fallback), AI Planner with exam/deadline/
placement-aware schedule reweighting, Voice commands + TTS, Face Attendance
nag, 6 themes, accent color, font size, backup/restore, and a floating pet
with 12 states.

## What's deliberately not built

- **Real pixel art / Google Fonts** — `scripts/generate-assets.js` makes
  crude colored placeholder PNGs (verified it runs, produces valid files);
  `scripts/download-font.js` is written correctly but needs network to
  actually fetch Google Fonts, which wasn't available here. CSS falls back
  to system fonts either way, so the app works, just less distinctive.
- **SQLite → JSON.** Your spec listed JSON as an accepted fallback, so this
  is a documented choice, not a gap — swap in `better-sqlite3` if you want
  it; `database/store.js` is the one file that would change.
- **Chart.js / Day.js → vanilla canvas / native Date.** Same network
  constraint; would need `npm install chart.js dayjs` and a rewrite of
  `analytics.ui.js`'s chart function and any date math you want on Day.js.
- **Mid-day automatic rearrangement.** The scheduler reprioritizes correctly
  at *generation* time based on exams/deadlines/placement prep, but doesn't
  yet watch for a missed block during the day and re-trigger — `reflow()`
  exists and is wired to an IPC channel, just not auto-invoked yet.

## Folder structure

```
main.js / preload.js / renderer.js / index.html / styles.css   — entry points
core/          window + tray management
database/      JSON store + your timetable data
components/    one folder per feature, each with a .ui.js (renderer) and/or
               plain .js (main process) file
scripts/       generate-assets.js, download-font.js
```
