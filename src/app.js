/**
 * app.js — StudyMatrix bootstrap, tab router, global error guards
 */

import './core/local-db.js';
import './core/auth.js';
import './core/sync-manager.js';
import './core/strict-timer.js';
import './core/audio-mixer.js';
import './core/voice-coach.js';
import './core/focus-shield.js';
import './features/1_onboarding.js';
import './features/2_pdf-mindmap.js';
import './features/3_feynman-quiz.js';
import './features/4_chatbot.js';
import './features/5_bionic-reader.js';
import './features/6_schedule.js';
import './features/7_settings.js';

const TAB_META = {
  'tab-dashboard': { title: 'Dashboard',     subtitle: 'Your study command centre' },
  'tab-mindmap':   { title: 'AI Mind-Map',   subtitle: 'Syllabus to neural graph in seconds' },
  'tab-focus':     { title: 'Focus Timer',   subtitle: 'Strict terminal — no distractions' },
  'tab-timer':     { title: 'Focus Timer',   subtitle: 'Strict terminal — no distractions' },
  'tab-sounds':    { title: 'Sound Lab',     subtitle: 'Ambient waves for deep focus' },
  'tab-feynman':   { title: 'Feynman Lab',   subtitle: 'Teach it to know it' },
  'tab-bionic':    { title: 'Bionic Reader', subtitle: 'Read faster with neural typography' },
  'tab-schedule':  { title: 'My Schedule',   subtitle: 'AI-adaptive study timetable' },
  'tab-settings':  { title: 'Settings',      subtitle: 'Cloud sync, simulation, JSON backup' },
};

function normalizeTab(id) {
  if (id === 'tab-timer') return 'tab-focus';
  return id;
}

export function switchTab(targetId) {
  const resolved = normalizeTab(targetId);
  const panels = document.querySelectorAll('.workspace-panel');
  const links  = document.querySelectorAll('.nav-link');
  const title  = document.getElementById('workspace-title');
  const sub    = document.getElementById('workspace-subtitle');

  panels.forEach((p) => p.classList.add('hidden'));
  links.forEach((l) => l.classList.remove('active'));

  const panel = document.getElementById(resolved) || document.getElementById(targetId);
  if (panel) panel.classList.remove('hidden');

  links.forEach((l) => {
    if (normalizeTab(l.dataset.tab) === resolved) l.classList.add('active');
  });

  const meta = TAB_META[resolved] || TAB_META[targetId] || {};
  if (title) title.textContent = meta.title || '';
  if (sub)   sub.textContent   = meta.subtitle || '';

  document.dispatchEvent(new CustomEvent('sm:tabchange', { detail: { tab: resolved } }));
}

function wireTabs() {
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(link.dataset.tab);
    });
  });

  document.querySelectorAll('[data-tab-link]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tabLink));
  });
}

function startSessionClock() {
  const sessionClock = document.getElementById('session-clock');
  const sessionStart = Date.now();
  setInterval(() => {
    const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    if (sessionClock) sessionClock.textContent = `${m}:${s}`;
  }, 1000);
}

window.__smStatPop = (elId) => {
  const el = document.getElementById(elId);
  if (!el) return;
  el.classList.remove('stat-pop');
  void el.offsetWidth;
  el.classList.add('stat-pop');
  setTimeout(() => el.classList.remove('stat-pop'), 400);
};

window.addEventListener('error', (event) => {
  console.warn('[StudyMatrix] Caught error:', event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.warn('[StudyMatrix] Unhandled promise:', event.reason);
});

function boot() {
  wireTabs();
  startSessionClock();
  console.log('%c[StudyMatrix] ALL SYSTEMS ONLINE — Production Ready 🚀', 'color:#10b981;font-size:14px;font-weight:bold;');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
