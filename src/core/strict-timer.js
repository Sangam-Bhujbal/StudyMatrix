/**
 * strict-timer.js — Canvas Focus Timer + Page Visibility Monitor
 * ───────────────────────────────────────────────────────────────
 * Features:
 *  • Canvas-drawn circular progress ring (smooth 60fps animation)
 *  • 3 modes: Pomodoro (25m), Deep Work (50m), Short Break (5m)
 *  • Page Visibility API — detects tab switching during session
 *  • Session log entries written to DOM + LocalStorage
 *  • Fires custom events: sm:timerStart, sm:timerEnd, sm:tabSwitch
 *  • Integrates with voice-coach.js and audio-mixer.js via events
 */

import { DB } from './local-db.js';

// ── DOM refs ──────────────────────────────────────────────────────
const canvas          = document.getElementById('timer-canvas');
const ctx             = canvas?.getContext('2d');
const btnStart        = document.getElementById('btn-timer-start');
const btnReset        = document.getElementById('btn-timer-reset');
const modeBtns        = document.querySelectorAll('.timer-mode-btn');
const sessionLogEl    = document.getElementById('session-log');
const tabWarningEl    = document.getElementById('tab-switch-warning');
const statSessions    = document.getElementById('stat-sessions');
const statFocus       = document.getElementById('stat-focus');

// ── Timer Config ──────────────────────────────────────────────────
const MODES = {
  pomodoro: { label: 'Pomodoro',    seconds: 25 * 60 },
  deep:     { label: 'Deep Work',   seconds: 50 * 60 },
  short:    { label: 'Short Break', seconds:  5 * 60 },
};

// ── State ─────────────────────────────────────────────────────────
let currentMode      = 'pomodoro';
let totalSeconds     = MODES.pomodoro.seconds;
let remainingSeconds = totalSeconds;
let isRunning        = false;
let rafId            = null;         // requestAnimationFrame id
let lastTimestamp    = null;
let tabSwitchCount   = 0;
let sessionStartTime = null;

// ── Canvas Sizing ─────────────────────────────────────────────────
const CANVAS_SIZE    = 280;
const CENTER         = CANVAS_SIZE / 2;
const RADIUS         = 118;
const LINE_WIDTH     = 12;
const BG_COLOR       = 'rgba(255,255,255,0.05)';
const RING_COLOR     = '#8b5cf6';
const RING_GLOW      = 'rgba(139,92,246,0.6)';
const BREAK_COLOR    = '#10b981';
const TEXT_COLOR     = '#f3f4f6';
const SUB_TEXT_COLOR = '#6b7280';

// ═══════════════════════════════════════════════════════════
// CANVAS DRAWING
// ═══════════════════════════════════════════════════════════

function drawTimer() {
  if (!ctx) return;

  const W = CANVAS_SIZE;
  const H = CANVAS_SIZE;
  const progress  = remainingSeconds / totalSeconds;
  const angle     = Math.PI * 2 * progress;
  const startAngle = -Math.PI / 2; // top

  ctx.clearRect(0, 0, W, H);

  // ── Background circle ──
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2);
  ctx.strokeStyle = BG_COLOR;
  ctx.lineWidth   = LINE_WIDTH;
  ctx.stroke();

  // ── Progress arc (with glow) ──
  const ringColor = currentMode === 'short' ? BREAK_COLOR : RING_COLOR;
  const ringGlow  = currentMode === 'short' ? 'rgba(16,185,129,0.6)' : RING_GLOW;

  ctx.save();
  ctx.shadowColor = ringGlow;
  ctx.shadowBlur  = isRunning ? 20 : 8;
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, RADIUS, startAngle, startAngle + angle);
  ctx.strokeStyle = ringColor;
  ctx.lineWidth   = LINE_WIDTH;
  ctx.lineCap     = 'round';
  ctx.stroke();
  ctx.restore();

  // ── Centre: time text ──
  const mins = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const secs = String(remainingSeconds % 60).padStart(2, '0');

  ctx.fillStyle = TEXT_COLOR;
  ctx.font      = 'bold 48px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${mins}:${secs}`, CENTER, CENTER - 10);

  // ── Centre: mode label ──
  ctx.fillStyle = SUB_TEXT_COLOR;
  ctx.font      = '14px Inter, system-ui, sans-serif';
  ctx.fillText(MODES[currentMode].label, CENTER, CENTER + 28);

  // ── Centre: running dot ──
  if (isRunning) {
    ctx.beginPath();
    ctx.arc(CENTER, CENTER + 50, 5, 0, Math.PI * 2);
    ctx.fillStyle = ringColor;
    ctx.fill();
    ctx.shadowColor = ringGlow;
    ctx.shadowBlur  = 10;
  }

  // ── Tab switch counter (if any) ──
  if (tabSwitchCount > 0) {
    ctx.fillStyle = '#ef4444';
    ctx.font      = '12px Inter, system-ui, sans-serif';
    ctx.fillText(`⚠ ${tabSwitchCount} breach${tabSwitchCount > 1 ? 'es' : ''}`, CENTER, CENTER + 68);
  }
}

// ═══════════════════════════════════════════════════════════
// TIMER LOGIC
// ═══════════════════════════════════════════════════════════

function tick(timestamp) {
  if (!isRunning) return;

  if (!lastTimestamp) lastTimestamp = timestamp;
  const elapsed = timestamp - lastTimestamp;

  if (elapsed >= 1000) {
    lastTimestamp = timestamp - (elapsed % 1000);
    remainingSeconds = Math.max(0, remainingSeconds - 1);
    drawTimer();

    if (remainingSeconds === 0) {
      completeSession();
      return;
    }
  }

  rafId = requestAnimationFrame(tick);
}

function startTimer() {
  if (isRunning) return;
  isRunning        = true;
  lastTimestamp    = null;
  sessionStartTime = Date.now();
  tabSwitchCount   = 0;

  btnStart.textContent = '⏸ Pause';
  btnStart.classList.add('animate-pulse-glow');

  rafId = requestAnimationFrame(tick);

  document.dispatchEvent(new CustomEvent('sm:timerStart', {
    detail: { mode: currentMode, seconds: totalSeconds }
  }));

  logSession(`▶ Started: ${MODES[currentMode].label} (${totalSeconds / 60}m)`, 'text-violet');
}

function pauseTimer() {
  if (!isRunning) return;
  isRunning = false;
  cancelAnimationFrame(rafId);
  lastTimestamp = null;

  btnStart.textContent = '▶ Resume';
  btnStart.classList.remove('animate-pulse-glow');

  drawTimer();

  document.dispatchEvent(new CustomEvent('sm:timerPause', {
    detail: { remainingSeconds, mode: currentMode }
  }));

  logSession(`⏸ Paused at ${formatTime(remainingSeconds)} remaining`, 'text-amber-400');
}

function resetTimer() {
  isRunning        = false;
  cancelAnimationFrame(rafId);
  lastTimestamp    = null;
  remainingSeconds = totalSeconds;
  tabSwitchCount   = 0;

  btnStart.textContent = '▶ Start';
  btnStart.classList.remove('animate-pulse-glow');
  tabWarningEl?.classList.add('hidden');

  drawTimer();
}

function completeSession() {
  isRunning = false;
  cancelAnimationFrame(rafId);
  remainingSeconds = 0;

  btnStart.textContent = '▶ Start';
  btnStart.classList.remove('animate-pulse-glow');

  drawTimer();

  // ── Update stats ──
  const duration = Math.round((Date.now() - sessionStartTime) / 60000);
  const stats    = DB.get('stats', { sessions: 0, focusMinutes: 0, topics: 0 });

  if (currentMode !== 'short') {
    stats.sessions     = (stats.sessions || 0) + 1;
    stats.focusMinutes = (stats.focusMinutes || 0) + Math.floor(totalSeconds / 60);
  }

  DB.set('stats', stats);
  refreshStatUI(stats);

  // ── Fire events ──
  document.dispatchEvent(new CustomEvent('sm:timerEnd', {
    detail: { mode: currentMode, duration, tabSwitchCount }
  }));

  logSession(
    `✅ Completed: ${MODES[currentMode].label} — ${tabSwitchCount} tab switches`,
    'text-emerald'
  );

  // ── Reset for next session ──
  setTimeout(() => resetTimer(), 1500);
}

// ── Mode switching ─────────────────────────────────────────
function setMode(mode) {
  if (isRunning) return; // Don't switch during active session
  currentMode      = mode;
  totalSeconds     = MODES[mode].seconds;
  remainingSeconds = totalSeconds;
  tabSwitchCount   = 0;

  modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  drawTimer();
}

// ─────────────────────────────────────────────────────────
// PAGE VISIBILITY API — Tab Switch Detection
// ─────────────────────────────────────────────────────────
document.addEventListener('visibilitychange', () => {
  if (document.hidden && isRunning) {
    tabSwitchCount++;

    // Show warning banner
    tabWarningEl?.classList.remove('hidden');
    setTimeout(() => tabWarningEl?.classList.add('hidden'), 4000);

    // Fire event (voice coach + audio mixer listen to this)
    document.dispatchEvent(new CustomEvent('sm:tabSwitch', {
      detail: { count: tabSwitchCount, mode: currentMode }
    }));

    drawTimer(); // Refresh breach count on canvas
  }
});

// ═══════════════════════════════════════════════════════════
// SESSION LOG
// ═══════════════════════════════════════════════════════════

function logSession(message, colorClass = 'text-gray-400') {
  if (!sessionLogEl) return;

  // Remove empty placeholder
  const placeholder = sessionLogEl.querySelector('.italic');
  placeholder?.remove();

  const now   = new Date();
  const time  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const entry = document.createElement('div');
  entry.className = `flex items-start gap-3 py-2 border-b border-white/5 last:border-0 animate-fade-in`;
  entry.innerHTML = `
    <span class="font-mono text-xs text-muted w-10 shrink-0">${time}</span>
    <span class="text-sm ${colorClass}">${message}</span>
  `;

  sessionLogEl.prepend(entry); // newest first

  // Cap at 20 entries
  const entries = sessionLogEl.querySelectorAll('div');
  if (entries.length > 20) entries[entries.length - 1].remove();
}

// ═══════════════════════════════════════════════════════════
// STAT UI REFRESH
// ═══════════════════════════════════════════════════════════

function refreshStatUI(stats) {
  if (statSessions) statSessions.textContent = stats.sessions || 0;
  if (statFocus)    statFocus.textContent     = `${stats.focusMinutes || 0}m`;
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

// ═══════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════

btnStart?.addEventListener('click', () => {
  isRunning ? pauseTimer() : startTimer();
});

btnReset?.addEventListener('click', () => resetTimer());

modeBtns.forEach(btn => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

// ─────────────────────────────────────────────────────────
// INIT — draw idle state
// ─────────────────────────────────────────────────────────
const savedStats = DB.get('stats', { sessions: 0, focusMinutes: 0, topics: 0 });
refreshStatUI(savedStats);
drawTimer();

// ── Export for cross-module access ──
export { isRunning, currentMode, remainingSeconds };

console.log('[Timer] Strict Focus Timer loaded ✅');
