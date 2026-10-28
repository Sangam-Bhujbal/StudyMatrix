/**
 * voice-coach.js — Multi-persona Web Speech API coach
 * Voices: Goggins (male/intense), Mentor (female/calm), Drill, Zen
 */

import { DB } from './local-db.js';

const voiceToggle  = document.getElementById('voice-coach-toggle');
const voiceSelect  = document.getElementById('voice-select');
const presetWrap   = document.getElementById('voice-preset-list');

const synth = window.speechSynthesis;
const isSpeechSupported = !!synth;

const PRESETS = {
  goggins: {
    label: 'Goggins',
    gender: 'male',
    rate: 1.08,
    pitch: 0.82,
    start: [
      "Stay hard. Focus mode is on. You don't get to negotiate with discomfort. Lock in.",
      "The clock is running. Most people quit when it gets quiet. You are not most people.",
    ],
    pause: [
      "Why are you stopping? Get back to focus!",
      "You paused already? That is weakness leaving — unless you hit resume right now.",
      "Hey. Why did you stop? Get back in the chair and finish the block.",
    ],
    tabSwitch: [
      "Focus breach! You ran from the work. Get back now.",
      "You switched tabs. That is a breach. Come back and stay hard.",
    ],
    complete: [
      "Block complete. That is how you build callouses on the mind. Take the break you earned.",
    ],
    shortBreak: [
      "Short break. Stand up. Water. No phone. Then we go again.",
    ],
  },
  mentor: {
    label: 'Mentor',
    gender: 'female',
    rate: 0.98,
    pitch: 1.12,
    start: [
      "Lovely. Focus is on. Breathe once, then give this block your full attention.",
      "Session started. You already know what to do. I will keep you company without crowding you.",
    ],
    pause: [
      "Why are you stopping? Get back to focus when you are ready — the work is still waiting.",
      "A pause is fine if you need air. If not, let's resume together.",
    ],
    tabSwitch: [
      "Focus breach noted. Gently come back to the page. You were doing well.",
      "I saw the tab switch. No judgement — just return to the session.",
    ],
    complete: [
      "Beautiful work. Session complete. Stretch, sip water, then we continue.",
    ],
    shortBreak: [
      "Break time. Soften your shoulders. Look away from the screen.",
    ],
  },
  drill: {
    label: 'Drill',
    gender: 'male',
    rate: 1.15,
    pitch: 0.9,
    start: [
      "Eyes forward. Timer live. No chatter. Execute.",
      "Focus terminal is hot. You will stay on task until I say otherwise.",
    ],
    pause: [
      "Why are you stopping? Get back to focus! That pause is unauthorized.",
      "Negative. Resume immediately. We are not done.",
    ],
    tabSwitch: [
      "Focus breach! Unauthorized tab. Return to station now.",
      "You left your post. Get back to the material.",
    ],
    complete: [
      "Time. Block complete. Hydrate. Reset. Next evolution shortly.",
    ],
    shortBreak: [
      "Break. Five minutes. Move your body. Do not open socials.",
    ],
  },
  zen: {
    label: 'Zen',
    gender: 'female',
    rate: 0.9,
    pitch: 1.05,
    start: [
      "Arrive here. The timer is a river — sit with it.",
      "Begin. One breath, one task. Nothing else is required.",
    ],
    pause: [
      "Why are you stopping? Get back to focus, or rest with intention — not with escape.",
      "A pause can be mindful. If it is avoidance, return.",
    ],
    tabSwitch: [
      "Attention wandered. That is a focus breach. Come home to the work.",
      "The other tab is weather. Your session is the ground. Return.",
    ],
    complete: [
      "The bell. You stayed. Rest without guilt.",
    ],
    shortBreak: [
      "Open space. Stretch. Let the last block settle.",
    ],
  },
};

let preferredVoice = null;
let allVoices = [];
let activePreset = DB.get('voice_preset', 'goggins');
let savedVoiceURI = DB.get('voice_uri', '');

function genderOf(voice) {
  const n = `${voice.name} ${voice.lang}`.toLowerCase();
  if (/female|woman|samantha|victoria|karen|moira|tessa|zira|susan|fiona|serena|google uk english female/.test(n)) {
    return 'female';
  }
  if (/male|david|daniel|mark|george|fred|google uk english male|alex/.test(n)) {
    return 'male';
  }
  return 'neutral';
}

function pickVoiceForPreset(presetKey) {
  const preset = PRESETS[presetKey] || PRESETS.goggins;
  const wanted = preset.gender;
  if (savedVoiceURI) {
    const exact = allVoices.find((v) => v.voiceURI === savedVoiceURI);
    if (exact) return exact;
  }
  return (
    allVoices.find((v) => genderOf(v) === wanted && v.lang.startsWith('en')) ||
    allVoices.find((v) => v.lang.startsWith('en')) ||
    allVoices[0] ||
    null
  );
}

function populateVoiceSelect() {
  if (!voiceSelect) return;
  voiceSelect.innerHTML = '';
  const groups = { female: [], male: [], neutral: [] };
  allVoices.forEach((v) => groups[genderOf(v)].push(v));

  ['female', 'male', 'neutral'].forEach((g) => {
    if (!groups[g].length) return;
    const og = document.createElement('optgroup');
    og.label = g === 'female' ? 'Female voices' : g === 'male' ? 'Male voices' : 'Other voices';
    groups[g].forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      if (savedVoiceURI ? v.voiceURI === savedVoiceURI : preferredVoice && v.voiceURI === preferredVoice.voiceURI) {
        opt.selected = true;
      }
      og.appendChild(opt);
    });
    voiceSelect.appendChild(og);
  });
}

function loadVoices() {
  if (!isSpeechSupported) return;
  allVoices = synth.getVoices();
  preferredVoice = pickVoiceForPreset(activePreset);
  populateVoiceSelect();
}

if (isSpeechSupported) {
  synth.onvoiceschanged = loadVoices;
  loadVoices();
}

function speak(text, options = {}) {
  if (!isSpeechSupported) return;
  if (!voiceToggle?.checked) return;
  if (synth.speaking) synth.cancel();

  const preset = PRESETS[activePreset] || PRESETS.goggins;
  const utt = new SpeechSynthesisUtterance(text);
  utt.voice = preferredVoice;
  utt.rate = options.rate ?? preset.rate;
  utt.pitch = options.pitch ?? preset.pitch;
  utt.volume = options.volume ?? 0.95;
  utt.lang = preferredVoice?.lang || 'en-US';
  synth.speak(utt);
}

function pickScript(category) {
  const preset = PRESETS[activePreset] || PRESETS.goggins;
  const pool = preset[category] || PRESETS.goggins[category];
  return pool[Math.floor(Math.random() * pool.length)];
}

function setPreset(key) {
  if (!PRESETS[key]) return;
  activePreset = key;
  DB.set('voice_preset', key);
  preferredVoice = pickVoiceForPreset(key);
  document.querySelectorAll('.voice-preset-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.preset === key);
  });
}

function bindPresetButtons() {
  if (!presetWrap) return;
  presetWrap.innerHTML = Object.entries(PRESETS).map(([key, p]) => `
    <button type="button" class="voice-preset-btn ${key === activePreset ? 'active' : ''}" data-preset="${key}">
      ${p.label}
      <span class="block text-[10px] opacity-70">${p.gender === 'female' ? '♀ Female' : '♂ Male'}</span>
    </button>
  `).join('');
  presetWrap.querySelectorAll('.voice-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setPreset(btn.dataset.preset);
      speak(`${PRESETS[btn.dataset.preset].label} coach ready.`, {});
    });
  });
}

voiceSelect?.addEventListener('change', () => {
  savedVoiceURI = voiceSelect.value;
  DB.set('voice_uri', savedVoiceURI);
  preferredVoice = allVoices.find((v) => v.voiceURI === savedVoiceURI) || preferredVoice;
  speak('Voice selected. I will coach you in this voice.', {});
});

document.addEventListener('sm:timerStart', (e) => {
  const { mode } = e.detail || {};
  speak(pickScript(mode === 'short' ? 'shortBreak' : 'start'));
});

document.addEventListener('sm:timerPause', (e) => {
  if ((e.detail?.remainingSeconds || 0) > 120) {
    speak(pickScript('pause'));
  }
});

document.addEventListener('sm:timerEnd', (e) => {
  if (e.detail?.mode === 'short') return;
  speak(pickScript('complete'));
});

document.addEventListener('sm:tabSwitch', () => {
  speak(pickScript('tabSwitch'));
});

voiceToggle?.addEventListener('change', () => {
  if (voiceToggle.checked) speak('Voice coach activated. I will keep you focused.');
  else synth.cancel();
});

document.getElementById('btn-preview-voice')?.addEventListener('click', () => {
  const prev = voiceToggle?.checked;
  if (voiceToggle) voiceToggle.checked = true;
  speak('Why are you stopping? Get back to focus!');
  if (voiceToggle && prev === false) {
    setTimeout(() => { voiceToggle.checked = false; }, 2500);
  }
});

bindPresetButtons();

export { speak };

if (!isSpeechSupported) {
  console.warn('[VoiceCoach] speechSynthesis not supported in this browser');
} else {
  console.log('[VoiceCoach] Multi-voice coach loaded ✅');
}
