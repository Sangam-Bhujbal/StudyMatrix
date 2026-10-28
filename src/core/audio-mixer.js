/**
 * audio-mixer.js — Dual-Audio Web Audio API Mixer
 * ─────────────────────────────────────────────────
 * Synthesises 3 ambient soundscapes entirely in-browser:
 *   1. 432Hz Solfeggio — pure sine wave tone
 *   2. Brown Noise     — filtered white noise (deep rumble)
 *   3. Rain + Thunder  — layered pink noise + thunder bursts
 *
 * Each track has:
 *   • Toggle play/stop button
 *   • Real-time volume slider (GainNode)
 *   • Visual status indicator
 *
 * AudioContext is created lazily on first user interaction
 * (required by browser autoplay policy).
 */

// ── AudioContext (lazy init) ───────────────────────────────
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browser policy)
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// ── Track State ────────────────────────────────────────────
const tracks = {
  432:   { node: null, gain: null, playing: false },
  brown: { node: null, gain: null, playing: false },
  rain:  { node: null, gain: null, playing: false },
};

// ═══════════════════════════════════════════════════════════
// SYNTHESIS FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Create a 432Hz sine-wave oscillator node
 */
function create432Hz(ctx, gainNode) {
  const osc       = ctx.createOscillator();
  osc.type        = 'sine';
  osc.frequency.setValueAtTime(432, ctx.currentTime);

  // Add gentle harmonics for richness
  const osc2      = ctx.createOscillator();
  osc2.type       = 'sine';
  osc2.frequency.setValueAtTime(864, ctx.currentTime); // Octave
  const harmGain  = ctx.createGain();
  harmGain.gain.setValueAtTime(0.15, ctx.currentTime);

  const merger    = ctx.createChannelMerger(2);
  osc.connect(gainNode);
  osc2.connect(harmGain);
  harmGain.connect(gainNode);

  osc.start();
  osc2.start();

  // Return composite stopper
  return {
    stop: () => { try { osc.stop(); osc2.stop(); } catch(_) {} },
  };
}

/**
 * Create Brown Noise via filtered white noise
 * Brown noise = white noise integrated over time (deeper rumble than pink)
 */
function createBrownNoise(ctx, gainNode) {
  const bufferSize   = ctx.sampleRate * 2; // 2 seconds looped
  const buffer       = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i]  = (lastOut + (0.02 * white)) / 1.02;
      lastOut  = data[i];
      data[i] *= 3.5; // Amplify
    }
  }

  const source      = ctx.createBufferSource();
  source.buffer     = buffer;
  source.loop       = true;

  // Low-pass filter for deep warmth
  const filter      = ctx.createBiquadFilter();
  filter.type       = 'lowpass';
  filter.frequency.setValueAtTime(400, ctx.currentTime);
  filter.Q.setValueAtTime(0.8, ctx.currentTime);

  source.connect(filter);
  filter.connect(gainNode);
  source.start();

  return { stop: () => { try { source.stop(); } catch(_) {} } };
}

/**
 * Create Rain + Thunder soundscape
 * Rain = pink noise (filtered white), Thunder = low-frequency burst at random intervals
 */
function createRain(ctx, gainNode) {
  // ── Rain (pink noise approximation) ──
  const bufferSize = ctx.sampleRate * 4;
  const buffer     = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0+b1+b2+b3+b4+b5+b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }

  const rainSource  = ctx.createBufferSource();
  rainSource.buffer = buffer;
  rainSource.loop   = true;

  const rainFilter  = ctx.createBiquadFilter();
  rainFilter.type   = 'bandpass';
  rainFilter.frequency.setValueAtTime(1200, ctx.currentTime);
  rainFilter.Q.setValueAtTime(0.5, ctx.currentTime);

  rainSource.connect(rainFilter);
  rainFilter.connect(gainNode);
  rainSource.start();

  // ── Thunder (scheduled random bursts) ──
  let thunderTimeout = null;

  function scheduleThunder() {
    const delay = 8000 + Math.random() * 20000; // Every 8–28 seconds
    thunderTimeout = setTimeout(() => {
      if (!tracks.rain.playing) return;

      const thunderGain = ctx.createGain();
      const osc         = ctx.createOscillator();
      osc.type          = 'sawtooth';
      osc.frequency.setValueAtTime(40 + Math.random() * 30, ctx.currentTime);

      // Rumble envelope
      thunderGain.gain.setValueAtTime(0, ctx.currentTime);
      thunderGain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.3);
      thunderGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);

      const lp = ctx.createBiquadFilter();
      lp.type  = 'lowpass';
      lp.frequency.setValueAtTime(120, ctx.currentTime);

      osc.connect(lp);
      lp.connect(thunderGain);
      thunderGain.connect(gainNode);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 3);

      scheduleThunder();
    }, delay);
  }

  scheduleThunder();

  return {
    stop: () => {
      try { rainSource.stop(); } catch(_) {}
      clearTimeout(thunderTimeout);
    }
  };
}

// ═══════════════════════════════════════════════════════════
// TOGGLE PLAY / STOP
// ═══════════════════════════════════════════════════════════

function toggleTrack(trackId) {
  const track  = tracks[trackId];
  const ctx    = getAudioCtx();
  const volEl  = document.getElementById(`vol-${trackId}`);
  const statEl = document.getElementById(`status-${trackId}`);
  const btnEl  = document.querySelector(`.audio-toggle-btn[data-freq="${trackId}"]`);

  if (track.playing) {
    // ── STOP ──
    track.node?.stop();
    track.gain?.disconnect();
    track.node  = null;
    track.gain  = null;
    track.playing = false;

    if (btnEl)  { btnEl.textContent = '▶'; btnEl.classList.remove('playing'); }
    if (statEl) statEl.textContent  = 'Stopped';

  } else {
    // ── PLAY ──
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(parseFloat(volEl?.value ?? 0.5), ctx.currentTime);
    gainNode.connect(ctx.destination);

    let node;
    if (trackId === 432   || trackId === '432')   node = create432Hz(ctx, gainNode);
    if (trackId === 'brown')                       node = createBrownNoise(ctx, gainNode);
    if (trackId === 'rain')                        node = createRain(ctx, gainNode);

    track.node    = node;
    track.gain    = gainNode;
    track.playing = true;

    if (btnEl)  { btnEl.textContent = '■'; btnEl.classList.add('playing'); }
    if (statEl) statEl.textContent  = 'Playing';
  }
}

// ── Volume slider (real-time gain update) ─────────────────
function setupVolumeSliders() {
  const sliders = document.querySelectorAll('.audio-slider');
  sliders.forEach(slider => {
    const trackId = slider.id.replace('vol-', '');
    slider.addEventListener('input', () => {
      const track = tracks[trackId];
      if (track?.gain) {
        track.gain.gain.setTargetAtTime(
          parseFloat(slider.value),
          getAudioCtx().currentTime,
          0.05 // Smooth 50ms ramp (no clicks)
        );
      }
    });
  });
}

// ── Auto-stop all audio when timer ends ───────────────────
document.addEventListener('sm:timerEnd', () => {
  Object.keys(tracks).forEach(id => {
    if (tracks[id].playing) toggleTrack(id);
  });
});

// ── Stop all tracks when page hidden during break ─────────
document.addEventListener('sm:tabSwitch', () => {
  // Just dim the audio as a cue, don't stop
  Object.values(tracks).forEach(t => {
    if (t.gain) {
      t.gain.gain.setTargetAtTime(0.1, getAudioCtx().currentTime, 0.1);
    }
  });
  // Restore after 3 seconds (when user returns)
  setTimeout(() => {
    document.querySelectorAll('.audio-slider').forEach(slider => {
      const trackId = slider.id.replace('vol-', '');
      const track   = tracks[trackId];
      if (track?.gain) {
        track.gain.gain.setTargetAtTime(parseFloat(slider.value), getAudioCtx().currentTime, 0.3);
      }
    });
  }, 3000);
});

// ═══════════════════════════════════════════════════════════
// BIND TOGGLE BUTTONS
// ═══════════════════════════════════════════════════════════

function bindAudioButtons() {
  document.querySelectorAll('.audio-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const freq = btn.dataset.freq;
      toggleTrack(freq);
    });
  });
}

// ── Init ──────────────────────────────────────────────────
bindAudioButtons();
setupVolumeSliders();

// Export for external control
export { toggleTrack, tracks, getAudioCtx };

console.log('[AudioMixer] Web Audio API mixer loaded ✅');
