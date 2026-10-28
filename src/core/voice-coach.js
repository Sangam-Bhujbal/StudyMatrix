/**
 * voice-coach.js — AI Voice Coach via Web Speech API
 * ────────────────────────────────────────────────────
 * Listens to timer events and "speaks" contextual coaching
 * messages using the browser's native speechSynthesis API.
 *
 * Triggered by:
 *   sm:timerStart  → motivational start message
 *   sm:timerPause  → firm warning message
 *   sm:timerEnd    → congratulatory completion message
 *   sm:tabSwitch   → aggressive distraction warning
 *
 * The voice coach toggle (checkbox) in the UI enables/disables.
 * Voice selection: prefers a natural English voice if available.
 */

// ── DOM refs ──────────────────────────────────────────────
const voiceToggle = document.getElementById('voice-coach-toggle');

// ── Speech API check ──────────────────────────────────────
const synth = window.speechSynthesis;
const isSpeechSupported = !!synth;

// ── Voice preference ──────────────────────────────────────
let preferredVoice = null;

function loadVoices() {
  const voices = synth.getVoices();
  // Priority: Google UK English Female → Google US English → any English
  preferredVoice =
    voices.find(v => v.name.includes('Google UK English Female')) ||
    voices.find(v => v.name.includes('Google US English Female')) ||
    voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0] ||
    null;
}

if (isSpeechSupported) {
  // Voices load async in most browsers
  synth.onvoiceschanged = loadVoices;
  loadVoices();
}

// ═══════════════════════════════════════════════════════════
// SCRIPT BANKS — categorised coach messages
// ═══════════════════════════════════════════════════════════

const SCRIPTS = {
  start: [
    "Focus mode activated. You've got this. Distractions are the enemy. Let's lock in.",
    "Session started. Close every tab you don't need. Your future self is counting on you right now.",
    "Deep work initiated. Remember — every minute of focus compounds. Stay locked.",
    "The timer is running. No phone. No social media. Just you and the work. Let's go.",
  ],

  pause: [
    "Hey. Why did you pause? You're breaking your flow state. Every pause costs you 23 minutes of recovery. Resume now.",
    "Paused already? Champions don't pause when things get hard. Get back in there.",
    "You stopped. That's okay — but only if it's a genuine emergency. If it's not, hit resume right now.",
    "Pausing early is the number one focus killer. You had momentum. Don't lose it. Resume the session.",
  ],

  tabSwitch: [
    "Focus breach detected! You switched tabs. That's a distraction. Return to your study immediately.",
    "Hey! Where are you going? You are in a focus session. Come back right now!",
    "Tab switch detected. Every time you switch, your brain needs time to refocus. Stop. Come back.",
    `Attention! You have left your study session ${'{count}'} time${'{plural}'}. This is costing you your goals.`,
  ],

  complete: [
    "Session complete! Outstanding work. You just earned a genuine break. Be proud of that focused effort.",
    "Timer complete. You stayed locked in and that is how champions are built. Well done.",
    "Brilliant work. Session finished. Take a short break, hydrate, and come back even stronger.",
    "That's a completed focus block. You are one step closer to mastery. Rest well and return ready.",
  ],

  shortBreak: [
    "Short break started. Step away from the screen. Stretch your body. Hydrate. Don't check social media.",
    "Break time. Get up. Move around. Your brain is consolidating what you just learned. Protect this time.",
  ],
};

// ═══════════════════════════════════════════════════════════
// SPEECH FUNCTION
// ═══════════════════════════════════════════════════════════

/**
 * Speaks a message using the Web Speech API
 * @param {string} text - message to speak
 * @param {object} options - rate, pitch, volume overrides
 */
function speak(text, options = {}) {
  if (!isSpeechSupported)              return;
  if (!voiceToggle?.checked)           return;
  if (synth.speaking)                  synth.cancel(); // Interrupt prev

  const utt           = new SpeechSynthesisUtterance(text);
  utt.voice           = preferredVoice;
  utt.rate            = options.rate   ?? 1.0;
  utt.pitch           = options.pitch  ?? 1.0;
  utt.volume          = options.volume ?? 0.95;
  utt.lang            = 'en-US';

  synth.speak(utt);
}

/**
 * Pick a random script from a category
 * @param {string} category
 * @param {object} vars - template variables (e.g. {count, plural})
 */
function pickScript(category, vars = {}) {
  const pool = SCRIPTS[category] || SCRIPTS.start;
  let   msg  = pool[Math.floor(Math.random() * pool.length)];

  // Template replacement
  Object.entries(vars).forEach(([k, v]) => {
    msg = msg.replaceAll(`{${k}}`, v);
  });

  return msg;
}

// ═══════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════

// Timer started
document.addEventListener('sm:timerStart', (e) => {
  const { mode } = e.detail;
  if (mode === 'short') {
    speak(pickScript('shortBreak'), { rate: 0.95, pitch: 1.05 });
  } else {
    speak(pickScript('start'), { rate: 1.0, pitch: 1.0 });
  }
});

// Timer paused early
document.addEventListener('sm:timerPause', (e) => {
  const { remainingSeconds } = e.detail;
  // Only yell if significant time is remaining (> 2 minutes)
  if (remainingSeconds > 120) {
    speak(pickScript('pause'), { rate: 1.05, pitch: 0.95, volume: 1.0 });
  }
});

// Timer completed
document.addEventListener('sm:timerEnd', (e) => {
  const { mode } = e.detail;
  if (mode === 'short') return; // No speech on break end
  speak(pickScript('complete'), { rate: 0.95, pitch: 1.1 });
});

// Tab switch during session — most aggressive
document.addEventListener('sm:tabSwitch', (e) => {
  const count  = e.detail.count || 1;
  const plural = count > 1 ? 's' : '';
  const msg    = pickScript('tabSwitch', { count, plural });
  speak(msg, { rate: 1.1, pitch: 0.9, volume: 1.0 });
});

// ── Voice test on toggle enable ───────────────────────────
voiceToggle?.addEventListener('change', () => {
  if (voiceToggle.checked) {
    speak("Voice coach activated. I will keep you focused.", { rate: 1.0, pitch: 1.05 });
  } else {
    synth.cancel();
  }
});

// ── Export ────────────────────────────────────────────────
export { speak };

if (!isSpeechSupported) {
  console.warn('[VoiceCoach] speechSynthesis not supported in this browser');
} else {
  console.log('[VoiceCoach] Web Speech API voice coach loaded ✅');
}
