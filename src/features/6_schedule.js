/**
 * schedule.js — Adaptive Study Schedule Generator
 * ─────────────────────────────────────────────────
 * Features:
 *  • User adds subjects + weekly hours
 *  • AI simulation (2.5s) generates a full 7-day timetable
 *  • Schedule adapts to chronotype (Morning Bird vs Night Owl)
 *  • Cards colour-coded by time-of-day slot
 *  • Subjects saved to LocalStorage (persist across refreshes)
 *  • Export schedule as printable HTML
 *  • Mark sessions as complete (strikethrough)
 */

import { DB } from '../core/local-db.js';

// ── DOM refs ──────────────────────────────────────────────────────
const subjectInput      = document.getElementById('schedule-subject');
const hoursInput        = document.getElementById('schedule-hours');
const btnAddSubject     = document.getElementById('btn-add-subject');
const subjectTagsEl     = document.getElementById('subject-tags');
const btnGenSchedule    = document.getElementById('btn-generate-schedule');
const scheduleLoading   = document.getElementById('schedule-loading');
const scheduleOutput    = document.getElementById('schedule-output');
const scheduleGrid      = document.getElementById('schedule-grid');
const dailyHoursInput   = document.getElementById('schedule-daily-hours');
const collegeStartInput = document.getElementById('schedule-college-start');
const collegeEndInput   = document.getElementById('schedule-college-end');
const studyWindowInput  = document.getElementById('schedule-study-window');

// ── State ─────────────────────────────────────────────────────────
let subjects = DB.get('schedule_subjects', []);
// e.g. [{ name: 'Physics', hours: 6 }, ...]

// ═══════════════════════════════════════════════════════════
// SUBJECT TAG MANAGEMENT
// ═══════════════════════════════════════════════════════════

function renderSubjectTags() {
  if (!subjectTagsEl) return;
  subjectTagsEl.innerHTML = '';

  if (subjects.length === 0) {
    subjectTagsEl.innerHTML =
      '<p class="text-xs text-gray-600 italic">No subjects added yet.</p>';
    return;
  }

  subjects.forEach((sub, idx) => {
    const tag       = document.createElement('span');
    tag.className   = 'subject-tag';
    tag.innerHTML   = `
      ${escapeHtml(sub.name)}
      <span class="text-muted text-xs">(${sub.hours}h/wk)</span>
      <button class="remove-tag ml-1" data-idx="${idx}" title="Remove">×</button>
    `;
    subjectTagsEl.appendChild(tag);
  });

  // Wire remove buttons
  subjectTagsEl.querySelectorAll('.remove-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      subjects.splice(parseInt(btn.dataset.idx), 1);
      DB.set('schedule_subjects', subjects);
      renderSubjectTags();
    });
  });
}

function addSubject() {
  const name  = subjectInput?.value.trim();
  const hours = parseInt(hoursInput?.value) || 0;

  if (!name)   { shakeEl(subjectInput);  return; }
  if (hours < 1 || hours > 40) { shakeEl(hoursInput); return; }

  // Prevent duplicates
  if (subjects.find(s => s.name.toLowerCase() === name.toLowerCase())) {
    if (subjectInput) subjectInput.value = '';
    return;
  }

  subjects.push({ name, hours });
  DB.set('schedule_subjects', subjects);
  renderSubjectTags();

  if (subjectInput) subjectInput.value = '';
  if (hoursInput)   hoursInput.value   = '';
  subjectInput?.focus();
}

btnAddSubject?.addEventListener('click', addSubject);

subjectInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter') addSubject();
});

// ═══════════════════════════════════════════════════════════
// SCHEDULE GENERATION (Simulated AI)
// ═══════════════════════════════════════════════════════════

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const MORNING_SLOTS = [
  { time: '06:30 – 07:30', label: 'Deep Work #1',     slot: 'morning'   },
  { time: '07:45 – 08:45', label: 'Active Recall',     slot: 'morning'   },
  { time: '09:00 – 10:30', label: 'Deep Work #2',     slot: 'morning'   },
  { time: '10:45 – 11:45', label: 'Problem Practice', slot: 'morning'   },
  { time: '14:00 – 15:00', label: 'Light Review',     slot: 'afternoon' },
  { time: '16:00 – 17:00', label: 'Feynman Session',  slot: 'afternoon' },
  { time: '20:00 – 21:00', label: 'Revision',         slot: 'evening'   },
];

const NIGHT_SLOTS = [
  { time: '10:00 – 11:00', label: 'Light Warm-Up',    slot: 'morning'   },
  { time: '14:00 – 15:00', label: 'Concept Review',   slot: 'afternoon' },
  { time: '16:00 – 17:00', label: 'Active Recall',    slot: 'afternoon' },
  { time: '19:30 – 21:00', label: 'Deep Work #1',     slot: 'night'     },
  { time: '21:15 – 22:45', label: 'Deep Work #2',     slot: 'night'     },
  { time: '23:00 – 00:00', label: 'Problem Practice', slot: 'night'     },
  { time: '00:15 – 01:00', label: 'Feynman Teach-Back', slot: 'night'  },
];

/**
 * Distributes subjects across days proportionally to their hours
 * Returns array of { day, time, label, subject, slot }
 */
function timeToMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function slotOverlapsCollege(time, collegeStart, collegeEnd) {
  const start = timeToMinutes(time.slice(0, 5));
  const end = timeToMinutes(time.slice(8, 13));
  return start < collegeEnd && end > collegeStart;
}

function buildScheduleData(subjects, chronotype, profile = {}) {
  const baseSlots = chronotype === 'morning' ? MORNING_SLOTS : NIGHT_SLOTS;
  const window = profile.studyWindow || (chronotype === 'morning' ? 'morning' : 'night');
  const collegeStart = timeToMinutes(profile.collegeStart || '09:00');
  const collegeEnd = timeToMinutes(profile.collegeEnd || '16:00');
  const dailyHours = Math.max(1, Number(profile.dailyHours) || 3);
  const preferred = baseSlots.filter(slot => {
    if (window === 'morning') return slot.slot === 'morning';
    if (window === 'afternoon') return slot.slot === 'afternoon';
    if (window === 'evening') return slot.slot === 'evening' || slot.slot === 'night';
    return slot.slot === 'night';
  });
  const availableSlots = [...preferred, ...baseSlots.filter(slot => !preferred.includes(slot))]
    .filter(slot => !slotOverlapsCollege(slot.time, collegeStart, collegeEnd));
  const slots = availableSlots.length ? availableSlots : baseSlots;
  const sessions = [];

  // Total weekly hours requested
  const totalHours = subjects.reduce((sum, s) => sum + s.hours, 0) || 1;

  DAYS.forEach((day, dayIdx) => {
    // Pick 2–4 slots per day (weekends slightly lighter)
    const isWeekend  = dayIdx >= 5;
    const targetSlots = Math.min(Math.ceil(dailyHours), slots.length);
    const slotsToday = slots.slice(0, isWeekend ? Math.max(1, targetSlots - 1) : targetSlots);

    slotsToday.forEach((slot, si) => {
      // Rotate subjects round-robin weighted by hours
      const subIdx   = (dayIdx * 4 + si) % subjects.length;
      const subject  = subjects[subIdx] || { name: 'General Study' };

      sessions.push({
        day,
        time:    slot.time,
        label:   slot.label,
        subject: subject.name,
        slot:    slot.slot,
        done:    false,
      });
    });
  });

  return sessions;
}

async function generateSchedule() {
  if (subjects.length === 0) {
    shakeEl(btnGenSchedule);
    showToast('Add at least one subject first!', 'warn');
    return;
  }

  // ── Loading state ──
  scheduleOutput?.classList.add('hidden');
  scheduleLoading?.classList.remove('hidden');
  btnGenSchedule.disabled    = true;
  btnGenSchedule.textContent = '⏳ Generating...';

  await new Promise(r => setTimeout(r, 2500)); // 2.5s simulation

  const user      = DB.get('user', {});
  const chronotype = user.chronotype || 'morning';
  const profile = {
    dailyHours: dailyHoursInput?.value || 3,
    collegeStart: collegeStartInput?.value || '09:00',
    collegeEnd: collegeEndInput?.value || '16:00',
    studyWindow: studyWindowInput?.value || (chronotype === 'morning' ? 'morning' : 'night'),
  };
  DB.set('schedule_profile', profile);
  const sessions  = buildScheduleData(subjects, chronotype, profile);

  // Save to DB
  DB.set('schedule_sessions', sessions);

  scheduleLoading?.classList.add('hidden');
  renderSchedule(sessions, chronotype);

  btnGenSchedule.disabled    = false;
  btnGenSchedule.textContent = '🗓 Generate My Schedule';
}

btnGenSchedule?.addEventListener('click', generateSchedule);

// ═══════════════════════════════════════════════════════════
// SCHEDULE RENDER
// ═══════════════════════════════════════════════════════════

function renderSchedule(sessions, chronotype) {
  if (!scheduleGrid || !scheduleOutput) return;

  scheduleGrid.innerHTML = '';

  // Group by day
  const byDay = {};
  DAYS.forEach(d => { byDay[d] = []; });
  sessions.forEach(s => byDay[s.day]?.push(s));

  DAYS.forEach((day, di) => {
    const daySessions = byDay[day] || [];
    const isWeekend   = di >= 5;

    const card         = document.createElement('div');
    card.className     = 'schedule-day-card glass-card rounded-xl p-4 animate-fade-in';
    card.style.animationDelay = `${di * 60}ms`;

    card.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-bold text-sm text-white">${day}</h4>
        <span class="text-xs px-2 py-0.5 rounded-full
          ${isWeekend
            ? 'bg-emerald/10 text-emerald border border-emerald/20'
            : 'bg-violet/10 text-violet border border-violet/20'}">
          ${isWeekend ? '🌿 Light' : '🎯 Full'}
        </span>
      </div>
      <div class="space-y-2" id="sessions-${day}"></div>
    `;

    scheduleGrid.appendChild(card);

    const sessionsEl = document.getElementById(`sessions-${day}`);
    daySessions.forEach((sess, si) => {
      const sessEl       = document.createElement('div');
      sessEl.className   = `schedule-session schedule-card ${sess.slot} cursor-pointer select-none`;
      sessEl.dataset.key = `${day}-${si}`;
      sessEl.innerHTML   = `
        <div class="flex items-start gap-2">
          <div class="flex-1 min-w-0">
            <p class="text-xs font-mono text-muted">${sess.time}</p>
            <p class="text-sm font-semibold text-white truncate mt-0.5">${escapeHtml(sess.subject)}</p>
            <p class="text-xs text-gray-500">${sess.label}</p>
          </div>
          <span class="done-check text-emerald text-lg opacity-0 transition-opacity shrink-0">✓</span>
        </div>
      `;

      // Toggle done on click
      sessEl.addEventListener('click', () => toggleSessionDone(sessEl, sess));
      sessionsEl?.appendChild(sessEl);
    });
  });

  scheduleOutput?.classList.remove('hidden');

  // Add export button
  addExportButton(sessions, chronotype);
}

function toggleSessionDone(el, sess) {
  sess.done = !sess.done;
  const check = el.querySelector('.done-check');

  if (sess.done) {
    el.style.opacity         = '0.45';
    el.style.textDecoration  = 'line-through';
    if (check) check.style.opacity = '1';
  } else {
    el.style.opacity        = '1';
    el.style.textDecoration = 'none';
    if (check) check.style.opacity = '0';
  }

  // Persist done states
  DB.set('schedule_sessions', DB.get('schedule_sessions', []).map(s => {
    if (s.day === sess.day && s.time === sess.time && s.subject === sess.subject) {
      s.done = sess.done;
    }
    return s;
  }));
}

function addExportButton(sessions, chronotype) {
  document.getElementById('schedule-export-btn')?.remove();

  const wrap       = document.createElement('div');
  wrap.id          = 'schedule-export-btn';
  wrap.className   = 'mt-4 flex justify-end';
  wrap.innerHTML   = `
    <button id="btn-export-schedule" class="btn-secondary text-sm px-5">
      🖨 Export Schedule
    </button>
  `;
  scheduleOutput?.appendChild(wrap);

  document.getElementById('btn-export-schedule')?.addEventListener('click', () => {
    printSchedule(sessions, chronotype);
  });
}

function printSchedule(sessions, chronotype) {
  const user    = DB.get('user', {});
  const name    = user.name || 'Scholar';
  const typeLabel = chronotype === 'morning' ? '🌅 Morning Bird' : '🦉 Night Owl';

  const rows = DAYS.map(day => {
    const daySess = sessions.filter(s => s.day === day);
    const cells   = daySess.map(s =>
      `<div style="margin-bottom:6px;">
         <span style="color:#6b7280;font-size:11px;font-family:monospace">${s.time}</span><br>
         <strong>${s.subject}</strong> — ${s.label}
       </div>`
    ).join('') || '<span style="color:#9ca3af;font-size:12px;">Rest day</span>';

    return `<td style="padding:12px;border:1px solid #e5e7eb;vertical-align:top;min-width:120px;">
              <strong style="font-size:13px;color:#111">${day}</strong><br><br>${cells}
            </td>`;
  }).join('');

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>StudyMatrix — ${name}'s Schedule</title>
      <style>
        body { font-family: Inter, system-ui, sans-serif; padding: 30px; color: #111; }
        h1   { font-size: 22px; margin-bottom: 4px; }
        p    { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
        table { border-collapse: collapse; width: 100%; }
      </style>
    </head>
    <body>
      <h1>📚 StudyMatrix Schedule</h1>
      <p>${name} · ${typeLabel} · Generated ${new Date().toLocaleDateString()}</p>
      <table><tr>${rows}</tr></table>
    </body>
    </html>
  `);
  win.document.close();
  win.print();
}

// ── Restore saved schedule on load ────────────────────────
const savedProfile = DB.get('schedule_profile', {});
if (dailyHoursInput && savedProfile.dailyHours) dailyHoursInput.value = savedProfile.dailyHours;
if (collegeStartInput && savedProfile.collegeStart) collegeStartInput.value = savedProfile.collegeStart;
if (collegeEndInput && savedProfile.collegeEnd) collegeEndInput.value = savedProfile.collegeEnd;
if (studyWindowInput && savedProfile.studyWindow) studyWindowInput.value = savedProfile.studyWindow;

const savedSessions = DB.get('schedule_sessions', []);
if (savedSessions.length > 0) {
  const user = DB.get('user', {});
  renderSchedule(savedSessions, user.chronotype || 'morning');
}
renderSubjectTags();

// ═══════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function shakeEl(el) {
  if (!el) return;
  el.animate([
    { transform: 'translateX(0)' },
    { transform: 'translateX(-6px)' },
    { transform: 'translateX(6px)' },
    { transform: 'translateX(-4px)' },
    { transform: 'translateX(4px)' },
    { transform: 'translateX(0)' },
  ], { duration: 380, easing: 'ease-in-out' });
}

function showToast(msg, type = 'info') {
  document.querySelectorAll('.sm-toast').forEach(t => t.remove());
  const colors = {
    warn:  'border-amber-500/40 bg-amber-500/10 text-amber-300',
    error: 'border-red-500/40 bg-red-500/10 text-red-300',
  };
  const toast     = document.createElement('div');
  toast.className = `sm-toast fixed top-5 right-5 z-50 px-4 py-3 rounded-xl border
                     backdrop-blur-md text-sm font-medium shadow-lg animate-slide-up
                     ${colors[type] || ''}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 350);
  }, 3000);
}

console.log('[Schedule] Adaptive schedule module loaded ✅');
