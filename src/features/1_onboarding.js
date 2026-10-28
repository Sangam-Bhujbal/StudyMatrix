/**
 * 1_onboarding.js — Chronotype Onboarding Logic
 * Phase 1 stub: renders guest modal, reads chronotype selection, and
 * unlocks the main app shell. Full adaptive schedule generation in Phase 3.
 */
import { DB } from '../core/local-db.js';

const overlay      = document.getElementById('guest-modal-overlay');
const appShell     = document.getElementById('app-shell');
const chatbot      = document.getElementById('chatbot-widget');
const inputName    = document.getElementById('input-name');
const enterBtn     = document.getElementById('btn-enter-app');
const chronoBtns   = document.querySelectorAll('.chronotype-btn');
const chronoBadge  = document.getElementById('chronotype-badge');
const chronoIcon   = document.getElementById('chronotype-icon');
const chronoLabel  = document.getElementById('chronotype-label');
const sidebarUser  = document.getElementById('sidebar-username');
const dashUser     = document.getElementById('dashboard-username');
const dashPill     = document.getElementById('dash-chronotype-pill');

let selectedType = null;

// ── If user already onboarded, skip modal ──
const saved = DB.get('user');
if (saved?.name) {
  bootApp(saved);
} else {
  overlay.classList.remove('hidden');
}

// ── Chronotype button selection ──
chronoBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    chronoBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedType = btn.dataset.type;
    validateForm();
  });
});

// ── Name input validation ──
inputName.addEventListener('input', validateForm);

function validateForm() {
  const valid = inputName.value.trim().length >= 2 && selectedType;
  enterBtn.disabled = !valid;
  enterBtn.classList.toggle('opacity-50',    !valid);
  enterBtn.classList.toggle('cursor-not-allowed', !valid);
}

// ── Enter app ──
enterBtn.addEventListener('click', () => {
  const user = { name: inputName.value.trim(), chronotype: selectedType };
  DB.set('user', user);
  bootApp(user);
});

function bootApp(user) {
  // Dismiss modal
  if (overlay) {
    overlay.style.transition = 'opacity 0.4s ease';
    overlay.style.opacity    = '0';
    setTimeout(() => overlay.classList.add('hidden'), 400);
  }

  // Show app + chatbot
  appShell?.classList.remove('hidden');
  chatbot?.classList.remove('hidden');

  // Populate UI with user data
  const name = user.name || 'Scholar';
  const type = user.chronotype || 'morning';
  const icon  = type === 'morning' ? '🌅' : '🦉';
  const label = type === 'morning' ? 'Morning Bird' : 'Night Owl';

  if (sidebarUser) sidebarUser.textContent  = name;
  if (dashUser)    dashUser.textContent      = name;
  if (chronoIcon)  chronoIcon.textContent    = icon;
  if (chronoLabel) chronoLabel.textContent   = label;
  if (chronoBadge) chronoBadge.classList.remove('hidden');
  if (dashPill)    dashPill.textContent      = `${icon} ${label}`;

  // Seed dashboard schedule preview
  seedSchedulePreview(type, name);

  console.log(`[Onboarding] Booted for ${name} (${type})`);
}

function seedSchedulePreview(type, name) {
  const el = document.getElementById('dashboard-schedule-preview');
  if (!el) return;

  const morning = [
    { time: '06:30', task: 'Deep Work Block #1 — High priority subjects', color: 'text-amber-400' },
    { time: '08:00', task: 'Active Recall Review (flashcards / Feynman)', color: 'text-violet' },
    { time: '09:30', task: 'Short Break — stretch + hydrate', color: 'text-emerald' },
    { time: '10:00', task: 'Deep Work Block #2 — Problem sets', color: 'text-amber-400' },
    { time: '12:00', task: 'Lunch + passive review (listen / re-read)', color: 'text-gray-400' },
  ];
  const night = [
    { time: '18:00', task: 'Light reading — warm-up', color: 'text-gray-400' },
    { time: '19:30', task: 'Deep Work Block #1 — High priority subjects', color: 'text-violet' },
    { time: '21:00', task: 'Feynman Technique — teach it to learn it', color: 'text-amber-400' },
    { time: '22:30', task: 'Deep Work Block #2 — Practice problems', color: 'text-violet' },
    { time: '00:00', task: 'Wind-down review + tomorrow\'s prep', color: 'text-emerald' },
  ];

  const slots = type === 'morning' ? morning : night;
  el.innerHTML = slots.map(s => `
    <div class="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <span class="font-mono text-xs ${s.color} w-12 shrink-0">${s.time}</span>
      <span class="text-sm text-gray-300">${s.task}</span>
    </div>
  `).join('');
}

console.log('[Onboarding] Module loaded');
