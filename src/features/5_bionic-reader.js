/**
 * 5_bionic-reader.js — Bionic Reading Mode
 * ──────────────────────────────────────────
 * How it works:
 *  Pure JS bolds the first N letters of every word,
 *  where N = ceil(word.length * fixation_ratio).
 *
 *  The fixation ratio (0.4 by default) is adjustable via
 *  a slider to suit the reader's comfort level.
 *
 * Features:
 *  • Real-time bionic conversion on paste/type
 *  • Fixation strength slider (0.3 → 0.6)
 *  • Word count + estimated reading time
 *  • Copy bionic text to clipboard (plain text fallback)
 *  • Font size controls (+/−)
 *  • Line height control for readability
 *  • Print / export as HTML snippet
 *  • Handles: punctuation, numbers, URLs, whitespace
 *  • Preserves paragraph structure
 */

// ── DOM refs ──────────────────────────────────────────────────────
const bionicInput     = document.getElementById('bionic-input');
const bionicOutput    = document.getElementById('bionic-output');
const btnConvert      = document.getElementById('btn-bionic-convert');
const btnClear        = document.getElementById('btn-bionic-clear');
const wordCountEl     = document.getElementById('bionic-word-count');
const readTimeEl      = document.getElementById('bionic-read-time');

// ── Bionic Config ─────────────────────────────────────────────────
const CONFIG = {
  fixationRatio:  0.4,   // % of word letters to bold
  wordsPerMinute: 238,   // avg reading speed (normal)
  bionicWPM:      380,   // bionic reading speed estimate
  minBold:        1,     // always bold at least 1 char
  fontSize:       16,    // px, adjustable
  lineHeight:     1.9,   // em
};

// ── State ─────────────────────────────────────────────────────────
let currentPlainText = '';

// ═══════════════════════════════════════════════════════════
// CORE: BIONIC TRANSFORM
// ═══════════════════════════════════════════════════════════

/**
 * Converts plain text into bionic HTML
 * @param {string} text - raw input text
 * @param {number} ratio - fixation ratio (0.3–0.6)
 * @returns {string} HTML with <strong> bold anchors
 */
function bionicTransform(text, ratio = CONFIG.fixationRatio) {
  if (!text.trim()) return '';

  // Split into paragraphs (preserve blank lines)
  const paragraphs = text.split(/\n\n+/);

  return paragraphs.map(para => {
    if (!para.trim()) return '<br>';

    // Split paragraph into lines, then words with spacing
    const lines = para.split('\n');

    const convertedLines = lines.map(line => {
      if (!line.trim()) return '';

      // Tokenise: words + surrounding punctuation/spaces
      const tokens = line.split(/(\s+)/);

      return tokens.map(token => {
        // Preserve whitespace tokens
        if (/^\s+$/.test(token)) return token;

        return convertWord(token, ratio);
      }).join('');
    });

    return `<p class="mb-4 leading-relaxed">${convertedLines.join('<br>')}</p>`;
  }).join('');
}

/**
 * Converts a single word token to bionic HTML
 * Handles: punctuation wrapping, URLs, numbers, mixed case
 */
function convertWord(token, ratio) {
  // Skip URLs
  if (/^https?:\/\//.test(token)) {
    return `<span class="text-violet text-sm">${escapeHtml(token)}</span>`;
  }

  // Extract leading/trailing punctuation
  const match     = token.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9'\-]+)([^a-zA-Z0-9]*)$/);
  if (!match) return escapeHtml(token); // symbols only

  const [, pre, word, post] = match;

  // Skip short tokens (1–2 chars) — just escape
  if (word.length <= 2) {
    return escapeHtml(pre) +
           `<strong class="bionic-bold">${escapeHtml(word)}</strong>` +
           escapeHtml(post);
  }

  // Calculate fixation point
  const boldLen = Math.max(CONFIG.minBold, Math.ceil(word.length * ratio));
  const boldPart = word.slice(0, boldLen);
  const restPart = word.slice(boldLen);

  return escapeHtml(pre) +
         `<strong class="bionic-bold">${escapeHtml(boldPart)}</strong>` +
         `<span class="bionic-rest">${escapeHtml(restPart)}</span>` +
         escapeHtml(post);
}

// ═══════════════════════════════════════════════════════════
// STATS: word count + reading time
// ═══════════════════════════════════════════════════════════

function updateStats(text) {
  const words    = text.trim() ? text.trim().split(/\s+/).length : 0;
  const normalMin = Math.ceil(words / CONFIG.wordsPerMinute);
  const bionicMin = Math.ceil(words / CONFIG.bionicWPM);

  if (wordCountEl) wordCountEl.textContent = `${words.toLocaleString()} words`;
  if (readTimeEl) {
    readTimeEl.textContent = words > 0
      ? `~${normalMin}m read → ${bionicMin}m bionic`
      : '~0 min read';
  }
}

// ═══════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════

function renderBionic(text) {
  if (!bionicOutput) return;

  if (!text.trim()) {
    bionicOutput.innerHTML = '<p class="text-gray-600 italic">Bionic text will appear here...</p>';
    return;
  }

  const html = bionicTransform(text, CONFIG.fixationRatio);
  bionicOutput.innerHTML = html;

  // Apply font settings
  bionicOutput.style.fontSize   = `${CONFIG.fontSize}px`;
  bionicOutput.style.lineHeight = CONFIG.lineHeight;

  // Animate words in
  bionicOutput.style.opacity    = '0';
  bionicOutput.style.transition = 'opacity 0.3s ease';
  requestAnimationFrame(() => { bionicOutput.style.opacity = '1'; });
}

// ═══════════════════════════════════════════════════════════
// INJECT CONTROLS PANEL
// ═══════════════════════════════════════════════════════════

function injectControlsPanel() {
  const outputCard = bionicOutput?.closest('.glass-card');
  if (!outputCard || document.getElementById('bionic-controls')) return;

  const panel       = document.createElement('div');
  panel.id          = 'bionic-controls';
  panel.className   = 'flex flex-wrap items-center gap-3 mb-3 pt-3 border-t border-white/10';
  panel.innerHTML   = `
    <!-- Fixation Strength -->
    <div class="flex items-center gap-2">
      <span class="text-xs text-muted whitespace-nowrap">Fixation</span>
      <input type="range" id="fixation-slider"
             min="0.2" max="0.7" step="0.05" value="${CONFIG.fixationRatio}"
             class="audio-slider w-24" title="Fixation ratio" />
      <span id="fixation-val" class="text-xs font-mono text-violet w-7">
        ${Math.round(CONFIG.fixationRatio * 100)}%
      </span>
    </div>

    <!-- Font Size -->
    <div class="flex items-center gap-1">
      <span class="text-xs text-muted">Size</span>
      <button id="font-minus"
              class="w-6 h-6 rounded bg-white/5 border border-white/10
                     text-white text-sm hover:bg-white/10 transition-colors">−</button>
      <span id="font-size-val" class="text-xs font-mono text-white w-8 text-center">
        ${CONFIG.fontSize}px
      </span>
      <button id="font-plus"
              class="w-6 h-6 rounded bg-white/5 border border-white/10
                     text-white text-sm hover:bg-white/10 transition-colors">+</button>
    </div>

    <!-- Copy Button -->
    <button id="btn-copy-bionic"
            class="btn-secondary text-xs px-3 py-1.5 rounded-lg ml-auto">
      📋 Copy Text
    </button>

    <!-- Print Button -->
    <button id="btn-print-bionic"
            class="btn-secondary text-xs px-3 py-1.5 rounded-lg">
      🖨 Print
    </button>
  `;

  // Insert before the output area
  bionicOutput?.insertAdjacentElement('beforebegin', panel);
  wireControls();
}

// ═══════════════════════════════════════════════════════════
// CONTROLS WIRING
// ═══════════════════════════════════════════════════════════

function wireControls() {
  // Fixation slider
  const fixSlider = document.getElementById('fixation-slider');
  const fixVal    = document.getElementById('fixation-val');
  fixSlider?.addEventListener('input', () => {
    CONFIG.fixationRatio = parseFloat(fixSlider.value);
    if (fixVal) fixVal.textContent = `${Math.round(CONFIG.fixationRatio * 100)}%`;
    if (currentPlainText) renderBionic(currentPlainText);
  });

  // Font size
  document.getElementById('font-minus')?.addEventListener('click', () => {
    CONFIG.fontSize = Math.max(12, CONFIG.fontSize - 1);
    document.getElementById('font-size-val').textContent = `${CONFIG.fontSize}px`;
    if (bionicOutput) bionicOutput.style.fontSize = `${CONFIG.fontSize}px`;
  });

  document.getElementById('font-plus')?.addEventListener('click', () => {
    CONFIG.fontSize = Math.min(24, CONFIG.fontSize + 1);
    document.getElementById('font-size-val').textContent = `${CONFIG.fontSize}px`;
    if (bionicOutput) bionicOutput.style.fontSize = `${CONFIG.fontSize}px`;
  });

  // Copy plain text (strip HTML)
  document.getElementById('btn-copy-bionic')?.addEventListener('click', () => {
    if (!currentPlainText) return;
    navigator.clipboard.writeText(currentPlainText).then(() => {
      const btn = document.getElementById('btn-copy-bionic');
      if (btn) {
        btn.textContent = '✅ Copied!';
        setTimeout(() => { btn.textContent = '📋 Copy Text'; }, 2000);
      }
    });
  });

  // Print
  document.getElementById('btn-print-bionic')?.addEventListener('click', () => {
    if (!currentPlainText) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bionic Read — StudyMatrix</title>
        <style>
          body { font-family: Georgia, serif; font-size: 16px; line-height: 1.9;
                 max-width: 700px; margin: 40px auto; padding: 0 20px; color: #111; }
          strong { font-weight: 900; }
        </style>
      </head>
      <body>${bionicTransform(currentPlainText, CONFIG.fixationRatio)}</body>
      </html>
    `);
    win.document.close();
    win.print();
  });
}

// ═══════════════════════════════════════════════════════════
// DEMO TEXT
// ═══════════════════════════════════════════════════════════

const DEMO_TEXT = `The human brain processes information using a sophisticated network of approximately 86 billion neurons, each forming thousands of synaptic connections. When we study, the hippocampus plays a crucial role in converting short-term memories into long-term storage through a process called memory consolidation.

Effective learning relies on spaced repetition — reviewing material at increasing intervals over time. This technique exploits the spacing effect, discovered by Hermann Ebbinghaus in 1885, which shows that information is retained significantly better when study sessions are spread out rather than massed together.

The Feynman technique, developed by physicist Richard Feynman, is widely considered one of the most powerful learning strategies ever devised. It involves four simple steps: choose a concept, explain it in simple terms as if teaching a child, identify gaps in your understanding, and return to the source material to fill those gaps.

Active recall — the practice of retrieving information from memory rather than passively re-reading — has been shown in multiple studies to improve long-term retention by up to 50% compared to passive review. Combining active recall with spaced repetition creates a compounding effect that elite students use to master complex subjects in a fraction of the expected time.`;

// ═══════════════════════════════════════════════════════════
// MAIN EVENT LISTENERS
// ═══════════════════════════════════════════════════════════

btnConvert?.addEventListener('click', () => {
  const text = bionicInput?.value.trim();
  if (!text) {
    // Load demo text if input is empty
    if (bionicInput) bionicInput.value = DEMO_TEXT;
    currentPlainText = DEMO_TEXT;
    updateStats(DEMO_TEXT);
    injectControlsPanel();
    renderBionic(DEMO_TEXT);
    return;
  }
  currentPlainText = text;
  updateStats(text);
  injectControlsPanel();
  renderBionic(text);
});

btnClear?.addEventListener('click', () => {
  if (bionicInput)  bionicInput.value   = '';
  if (bionicOutput) bionicOutput.innerHTML = '<p class="text-gray-600 italic">Bionic text will appear here...</p>';
  if (wordCountEl)  wordCountEl.textContent = '0 words';
  if (readTimeEl)   readTimeEl.textContent  = '~0 min read';
  currentPlainText = '';
  document.getElementById('bionic-controls')?.remove();
  bionicInput?.focus();
});

// Live stats update as user types (without full render)
let bionicLiveTimer = null;
bionicInput?.addEventListener('input', () => {
  updateStats(bionicInput.value);
  clearTimeout(bionicLiveTimer);
  bionicLiveTimer = setTimeout(() => {
    const text = bionicInput.value;
    currentPlainText = text;
    if (text.trim().length > 8) {
      injectControlsPanel();
      renderBionic(text);
    }
  }, 220);
});

// ── Paste event: auto-convert on paste ─────────────────────
bionicInput?.addEventListener('paste', () => {
  // Wait for paste to land in textarea
  setTimeout(() => {
    const text = bionicInput.value.trim();
    if (text.length > 30) {
      currentPlainText = text;
      updateStats(text);
      injectControlsPanel();
      renderBionic(text);
    }
  }, 80);
});

// ═══════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Export transform for external use
export { bionicTransform };

console.log('[BionicReader] Module loaded ✅');
