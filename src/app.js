/**
 * app.js — StudyMatrix Bootstrap & Tab Router
 * Phase 1 stub: imports all feature modules and wires tab navigation.
 * Full implementation delivered in Phase 2.
 */

// ── Module Imports ──────────────────────────────────────────────────
import './core/local-db.js';
import './features/1_onboarding.js';
import './features/2_pdf-mindmap.js';

console.log('%c[StudyMatrix] Bootstrap loaded — Phase 2 Ready 🧠', 'color:#8b5cf6;font-weight:bold;');

// ── Tab Router ──────────────────────────────────────────────────────
const NAV_LINKS   = document.querySelectorAll('.nav-link');
const WS_PANELS   = document.querySelectorAll('.workspace-panel');
const WS_TITLE    = document.getElementById('workspace-title');
const WS_SUBTITLE = document.getElementById('workspace-subtitle');

const TAB_META = {
  'tab-dashboard': { title: 'Dashboard',     subtitle: 'Your study command centre' },
  'tab-mindmap':   { title: 'AI Mind-Map',   subtitle: 'Syllabus to neural graph in seconds' },
  'tab-timer':     { title: 'Focus Timer',   subtitle: 'Strict terminal — no distractions' },
  'tab-feynman':   { title: 'Feynman Lab',   subtitle: 'Teach it to know it' },
  'tab-bionic':    { title: 'Bionic Reader', subtitle: 'Read faster with neural typography' },
  'tab-schedule':  { title: 'My Schedule',   subtitle: 'AI-adaptive study timetable' },
};

export function switchTab(targetId) {
  WS_PANELS.forEach(p => p.classList.add('hidden'));
  NAV_LINKS.forEach(l => l.classList.remove('active'));

  const panel = document.getElementById(targetId);
  if (panel) panel.classList.remove('hidden');

  NAV_LINKS.forEach(l => {
    if (l.dataset.tab === targetId) l.classList.add('active');
  });

  const meta = TAB_META[targetId] || {};
  if (WS_TITLE)    WS_TITLE.textContent    = meta.title    || '';
  if (WS_SUBTITLE) WS_SUBTITLE.textContent = meta.subtitle || '';

  // Dispatch event so feature modules can react
  document.dispatchEvent(new CustomEvent('sm:tabchange', { detail: { tab: targetId } }));
}

// Wire sidebar nav clicks
NAV_LINKS.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    switchTab(link.dataset.tab);
  });
});

// Wire dashboard quick-action buttons
document.querySelectorAll('[data-tab-link]').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tabLink));
});

// ── Session Clock ────────────────────────────────────────────────────
const sessionClock = document.getElementById('session-clock');
const sessionStart = Date.now();
setInterval(() => {
  const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  if (sessionClock) sessionClock.textContent = `${m}:${s}`;
}, 1000);
