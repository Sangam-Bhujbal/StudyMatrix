/**
 * voice-coach.js — Bilingual/trilingual Web Speech API coach
 * Voices: Male or Female, with English, Hindi, and Marathi language selection.
 */

import { DB } from './local-db.js';

const voiceToggle  = document.getElementById('voice-coach-toggle');
const languageSelect = document.getElementById('voice-language');
const presetWrap   = document.getElementById('voice-preset-list');

const synth = window.speechSynthesis;
const isSpeechSupported = !!synth;

const PRESETS = {
  male: {
    label: 'Male',
    gender: 'male',
    rate: 1.08,
    pitch: 0.82,
    start: [
      "Focus mode is live. One clear block, one brave decision, and you are closer to your goal.",
      "The clock is moving, but so are you. Start with the next small task and build momentum.",
    ],
    pause: [
      "Pause noticed. Take one breath, then return to the exact task in front of you.",
      "Your future result is hiding inside this block. Resume when you are ready.",
    ],
    tabSwitch: [
      "Focus drift detected. Close the distraction and bring your attention back.",
      "The tab changed, but your goal did not. Return to your study block.",
    ],
    complete: [
      "Block complete. You kept a promise to yourself. Take a real break, then choose the next win.",
    ],
    shortBreak: [
      "Short break: stand up, drink water, and let your brain reset before the next round.",
    ],
  },
  female: {
    label: 'Female',
    gender: 'female',
    rate: 0.98,
    pitch: 1.12,
    start: [
      "Welcome to your focus space. Breathe once, choose one task, and let the session carry you forward.",
      "You do not need perfect motivation. You only need a calm first step.",
    ],
    pause: [
      "A pause is okay. Reset gently, then return to the next simple action.",
      "Your attention wandered; that is human. Come back without judgement.",
    ],
    tabSwitch: [
      "A distraction opened. Close it and return to your plan; your progress is still safe.",
      "No judgement for the tab switch. Come back and give yourself another focused minute.",
    ],
    complete: [
      "Beautiful work. Session complete. Notice that progress, stretch, and enjoy your break.",
    ],
    shortBreak: [
      "Break time. Relax your shoulders, look away from the screen, and return refreshed.",
    ],
  },
};

let preferredVoice = null;
let allVoices = [];
let activePreset = DB.get('voice_preset', 'male');
let savedVoiceURI = DB.get('voice_uri', '');
let activeLanguage = DB.get('voice_language', 'en-US');

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
  const preset = PRESETS[presetKey] || PRESETS.male;
  const wanted = preset.gender;
  if (savedVoiceURI) {
    const saved = allVoices.find((v) => v.voiceURI === savedVoiceURI);
    if (saved
      && saved.lang.toLowerCase().startsWith(activeLanguage.slice(0, 2).toLowerCase())
      && (genderOf(saved) === wanted || genderOf(saved) === 'neutral')) {
      return saved;
    }
  }
  return (
    allVoices.find((v) => genderOf(v) === wanted && v.lang.toLowerCase().startsWith(activeLanguage.slice(0, 2).toLowerCase())) ||
    allVoices.find((v) => v.lang.toLowerCase().startsWith(activeLanguage.slice(0, 2).toLowerCase())) ||
    allVoices.find((v) => genderOf(v) === wanted && v.lang.startsWith('en')) ||
    allVoices[0] ||
    null
  );
}

function loadVoices() {
  if (!isSpeechSupported) return;
  allVoices = synth.getVoices();
  preferredVoice = pickVoiceForPreset(activePreset);
}

if (isSpeechSupported) {
  synth.onvoiceschanged = loadVoices;
  loadVoices();
}

function speak(text, options = {}) {
  if (!isSpeechSupported) return;
  if (!voiceToggle?.checked) return;
  if (synth.speaking) synth.cancel();

  const preset = PRESETS[activePreset] || PRESETS.male;
  const utt = new SpeechSynthesisUtterance(text);
  utt.voice = preferredVoice;
  utt.rate = options.rate ?? preset.rate;
  utt.pitch = options.pitch ?? preset.pitch;
  utt.volume = options.volume ?? 0.95;
  utt.lang = preferredVoice?.lang || activeLanguage;
  synth.speak(utt);
}

function pickScript(category) {
  const preset = PRESETS[activePreset] || PRESETS.male;
  const localized = LOCALIZED_SCRIPTS[activeLanguage]?.[category];
  const pool = localized || preset[category] || PRESETS.male[category];
  return pool[Math.floor(Math.random() * pool.length)];
}

const LOCALIZED_SCRIPTS = {
  'hi-IN': {
    start: ['फोकस मोड शुरू है। एक छोटा कदम उठाइए और अपनी पढ़ाई को आगे बढ़ाइए।', 'आपको पूरी तरह प्रेरित होने की जरूरत नहीं है। बस पहला सवाल हल कीजिए।'],
    pause: ['एक गहरी सांस लीजिए और अपने अगले काम पर वापस आइए।', 'रुकना ठीक है, लेकिन अपने लक्ष्य को मत भूलिए।'],
    tabSwitch: ['ध्यान भटक गया है। यह टैब बंद करके अपनी पढ़ाई पर वापस आइए।', 'आपका लक्ष्य वही है। अब वापस फोकस कीजिए।'],
    complete: ['बहुत बढ़िया! यह स्टडी ब्लॉक पूरा हुआ। अब थोड़ा आराम कीजिए।'],
    shortBreak: ['छोटा ब्रेक लीजिए, पानी पीजिए और अगली राउंड के लिए तैयार हो जाइए।'],
  },
  'mr-IN': {
    start: ['फोकस मोड सुरू आहे. एक छोटं पाऊल उचला आणि अभ्यास पुढे न्या.', 'पूर्ण मोटिवेशनची गरज नाही; फक्त पहिला प्रश्न सुरू करा.'],
    pause: ['एक दीर्घ श्वास घ्या आणि समोरच्या पुढच्या कामाकडे परत या.', 'थांबणं ठीक आहे, पण तुमचं ध्येय विसरू नका.'],
    tabSwitch: ['लक्ष विचलित झालं आहे. हा टॅब बंद करा आणि अभ्यासाकडे परत या.', 'तुमचं ध्येय तिथेच आहे. आता पुन्हा फोकस करा.'],
    complete: ['छान काम! हा स्टडी ब्लॉक पूर्ण झाला. आता थोडी विश्रांती घ्या.'],
    shortBreak: ['छोटा ब्रेक घ्या, पाणी प्या आणि पुढच्या राउंडसाठी तयार व्हा.'],
  },
};

function setPreset(key) {
  if (!PRESETS[key]) return;
  activePreset = key;
  DB.set('voice_preset', key);
  preferredVoice = pickVoiceForPreset(key);
  savedVoiceURI = preferredVoice?.voiceURI || '';
  DB.set('voice_uri', savedVoiceURI);
  document.querySelectorAll('.voice-preset-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.preset === key);
  });
}

function setLanguage(language) {
  activeLanguage = language;
  DB.set('voice_language', language);
  preferredVoice = pickVoiceForPreset(activePreset);
  savedVoiceURI = preferredVoice?.voiceURI || '';
  DB.set('voice_uri', savedVoiceURI);
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
      speak(`${PRESETS[btn.dataset.preset].label} voice ready.`, {});
    });
  });
}

if (languageSelect) {
  languageSelect.value = activeLanguage;
  languageSelect.addEventListener('change', () => setLanguage(languageSelect.value));
}

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
  if (voiceToggle.checked)   speak('Voice coach activated. Your next focused step starts now.');
  else synth.cancel();
});

document.getElementById('btn-preview-voice')?.addEventListener('click', () => {
  const prev = voiceToggle?.checked;
  if (voiceToggle) voiceToggle.checked = true;
  speak('Focus check: take a breath and return to your next small task.');
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
