/**
 * 3_feynman-quiz.js — Feynman Evaluator & Notes-to-Quiz Generator
 * ─────────────────────────────────────────────────────────────────
 * Two sub-systems in one module:
 *
 * A) FEYNMAN EVALUATOR
 *    • User types explanation of a concept in plain English
 *    • 2.5s AI simulation → mock accuracy score + grade + strengths/gaps
 *    • Score rendered as animated Canvas arc ring
 *    • Results: grade badge, strengths list, missing points, resources
 *
 * B) NOTES-TO-QUIZ GENERATOR
 *    • User pastes study notes
 *    • 2.5s AI simulation → 5 multiple-choice questions
 *    • Interactive quiz: click answer → instant correct/wrong feedback
 *    • Score tracked: X / 5 correct shown at end
 */

import { simulateFeynmanEval, simulateQuizGeneration } from '../config/api-simulator.js';
import { DB } from '../core/local-db.js';

// ═══════════════════════════════════════════════════════════
// A) FEYNMAN EVALUATOR — DOM refs & State
// ═══════════════════════════════════════════════════════════

const feynmanTopicInput = document.getElementById('feynman-topic');
const feynmanTextarea   = document.getElementById('feynman-text');
const btnFeynmanEval    = document.getElementById('btn-feynman-eval');
const feynmanLoading    = document.getElementById('feynman-loading');
const feynmanEmpty      = document.getElementById('feynman-empty');
const feynmanResults    = document.getElementById('feynman-results');
const scoreCanvas       = document.getElementById('score-ring-canvas');
const scoreValueEl      = document.getElementById('score-value');
const feynmanGradeEl    = document.getElementById('feynman-grade');
const feynmanVerdictEl  = document.getElementById('feynman-verdict');
const feynmanStrengths  = document.getElementById('feynman-strengths');
const feynmanGaps       = document.getElementById('feynman-gaps');
const feynmanResources  = document.getElementById('feynman-resources');

// ── Grade color map ────────────────────────────────────────
const GRADE_COLORS = {
  'A+': '#10b981',
  'A':  '#34d399',
  'B+': '#a78bfa',
  'B':  '#8b5cf6',
  'C':  '#f59e0b',
  'D':  '#ef4444',
};

// ═══════════════════════════════════════════════════════════
// SCORE RING CANVAS
// ═══════════════════════════════════════════════════════════

/**
 * Draws an animated score arc on the small canvas ring
 * @param {number} targetPct - 0 to 100
 * @param {string} grade - e.g. 'A+'
 */
function animateScoreRing(targetPct, grade) {
  const canvas = scoreCanvas;
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  const SIZE   = 96;
  const CX     = SIZE / 2;
  const CY     = SIZE / 2;
  const R      = 36;
  const LW     = 8;
  const color  = GRADE_COLORS[grade] || '#8b5cf6';
  let   current = 0;

  function drawFrame() {
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Background ring
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth   = LW;
    ctx.stroke();

    // Progress arc
    const angle = (Math.PI * 2) * (current / 100);
    ctx.beginPath();
    ctx.arc(CX, CY, R, -Math.PI / 2, -Math.PI / 2 + angle);
    ctx.strokeStyle = color;
    ctx.lineWidth   = LW;
    ctx.lineCap     = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur  = 10;
    ctx.stroke();

    if (current < targetPct) {
      current = Math.min(current + 2, targetPct);
      requestAnimationFrame(drawFrame);
    }

    // Update text counter
    if (scoreValueEl) scoreValueEl.textContent = `${Math.round(current)}%`;
  }

  drawFrame();
}

// ═══════════════════════════════════════════════════════════
// FEYNMAN EVALUATE HANDLER
// ═══════════════════════════════════════════════════════════

async function runFeynmanEvaluation() {
  const topic = feynmanTopicInput?.value.trim();
  const text  = feynmanTextarea?.value.trim();

  if (!text || text.split(/\s+/).length < 5) {
    shakeElement(feynmanTextarea);
    showToast('Please write at least a few sentences about the concept.', 'warn');
    return;
  }

  // ── 1. Show loading state ──
  feynmanEmpty?.classList.add('hidden');
  feynmanResults?.classList.add('hidden');
  feynmanLoading?.classList.remove('hidden');

  btnFeynmanEval.disabled     = true;
  btnFeynmanEval.textContent  = '⏳ Evaluating...';

  try {
    // ── 2. Simulate AI (2.5s) ──
    const result = await simulateFeynmanEval(text);

    // ── 3. Hide loading, show results ──
    feynmanLoading?.classList.add('hidden');
    feynmanResults?.classList.remove('hidden');

    // ── 4. Render score ring ──
    animateScoreRing(result.accuracy, result.grade);

    // ── 5. Grade + verdict ──
    if (feynmanGradeEl) {
      feynmanGradeEl.textContent = `Grade: ${result.grade}`;
      feynmanGradeEl.style.color = GRADE_COLORS[result.grade] || '#8b5cf6';
    }
    if (feynmanVerdictEl) feynmanVerdictEl.textContent = result.verdict;

    // ── 6. Strengths list ──
    if (feynmanStrengths) {
      feynmanStrengths.innerHTML = result.strengths
        .map(s => `<li class="animate-fade-in">${s}</li>`)
        .join('');
    }

    // ── 7. Gaps list ──
    if (feynmanGaps) {
      const gaps = result.gaps || result.missing_concepts || [];
      feynmanGaps.innerHTML = gaps
        .map(g => `<li class="animate-fade-in">${g}</li>`)
        .join('');
    }

    // ── 8. Resources list ──
    if (feynmanResources) {
      feynmanResources.innerHTML = result.resources
        .map(r => `<li class="animate-fade-in">${r}</li>`)
        .join('');
    }

    // ── 9. Save to history ──
    saveFeynmanHistory(topic || 'Untitled', result.accuracy, result.grade);

    console.log(`[Feynman] Evaluation complete — ${result.grade} (${result.accuracy}%)`);

  } catch (err) {
    console.error('[Feynman] Eval error:', err);
    feynmanLoading?.classList.add('hidden');
    feynmanEmpty?.classList.remove('hidden');
    showToast('Evaluation failed. Please try again.', 'error');
  } finally {
    btnFeynmanEval.disabled    = false;
    btnFeynmanEval.textContent = '🧠 Evaluate with AI';
  }
}

// ── Character counter on textarea ─────────────────────────
feynmanTextarea?.addEventListener('input', () => {
  const words = feynmanTextarea.value.trim().split(/\s+/).filter(Boolean).length;
  const count = feynmanTextarea.closest('.glass-card')
    ?.querySelector('.word-count-badge');
  if (count) count.textContent = `${words} words`;
});

// ── Inject word count badge ────────────────────────────────
if (feynmanTextarea) {
  const badge       = document.createElement('span');
  badge.className   = 'word-count-badge text-xs text-muted float-right mb-1';
  badge.textContent = '0 words';
  feynmanTextarea.insertAdjacentElement('beforebegin', badge);
}

// ── Evaluate button ────────────────────────────────────────
btnFeynmanEval?.addEventListener('click', runFeynmanEvaluation);

// ── Enter key submits (Ctrl+Enter in textarea) ─────────────
feynmanTextarea?.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter') runFeynmanEvaluation();
});

// ── Save eval history to LocalStorage ─────────────────────
function saveFeynmanHistory(topic, accuracy, grade) {
  const history = DB.get('feynman_history', []);
  history.unshift({
    topic,
    accuracy,
    grade,
    date: new Date().toISOString(),
  });
  DB.set('feynman_history', history.slice(0, 20)); // Keep last 20
}


// ═══════════════════════════════════════════════════════════
// B) NOTES-TO-QUIZ GENERATOR — DOM refs & State
// ═══════════════════════════════════════════════════════════

const quizNotesInput  = document.getElementById('quiz-notes-input');
const btnGenerateQuiz = document.getElementById('btn-generate-quiz');
const btnDemoQuiz     = document.getElementById('btn-demo-quiz');
const quizLoading     = document.getElementById('quiz-loading');
const quizOutput      = document.getElementById('quiz-output');

let quizState = {
  questions:    [],
  answers:      {},   // { questionIndex: chosenOptionIndex }
  submitted:    false,
  correctCount: 0,
};

// ═══════════════════════════════════════════════════════════
// QUIZ GENERATION
// ═══════════════════════════════════════════════════════════

async function generateQuiz(notes = '') {
  // ── 1. Show loading ──
  quizOutput.innerHTML = '';
  quizLoading?.classList.remove('hidden');
  btnGenerateQuiz.disabled   = true;
  btnGenerateQuiz.textContent = '⏳ Generating...';
  btnDemoQuiz.disabled        = true;

  try {
    // ── 2. Simulate AI ──
    const result = await simulateQuizGeneration(notes);

    // ── 3. Store state ──
    quizState = { questions: result.questions, answers: {}, submitted: false, correctCount: 0 };

    // ── 4. Render quiz ──
    quizLoading?.classList.add('hidden');
    renderQuiz(result);

  } catch (err) {
    console.error('[Quiz] Generation error:', err);
    quizLoading?.classList.add('hidden');
    showToast('Quiz generation failed. Please try again.', 'error');
  } finally {
    btnGenerateQuiz.disabled    = false;
    btnGenerateQuiz.textContent = 'Generate Quiz ✨';
    btnDemoQuiz.disabled        = false;
  }
}

// ═══════════════════════════════════════════════════════════
// QUIZ RENDERING
// ═══════════════════════════════════════════════════════════

function renderQuiz(result) {
  if (!quizOutput) return;

  quizOutput.innerHTML = '';

  // ── Topic header ──
  const header       = document.createElement('div');
  header.className   = 'flex items-center justify-between mb-4';
  header.innerHTML   = `
    <div>
      <h4 class="font-semibold text-white text-sm">📋 Quiz: ${escapeHtml(result.topic)}</h4>
      <p class="text-xs text-muted mt-0.5">${result.questions.length} questions • Click an answer to begin</p>
    </div>
    <span class="ai-badge">🤖 AI Generated</span>
  `;
  quizOutput.appendChild(header);

  // ── Render each question ──
  result.questions.forEach((q, qi) => {
    const card       = document.createElement('div');
    card.className   = 'quiz-card animate-fade-in';
    card.dataset.qi  = qi;

    card.innerHTML = `
      <p class="text-sm font-semibold text-white mb-3">
        <span class="text-muted font-mono mr-2">Q${qi + 1}.</span>${escapeHtml(q.q)}
      </p>
      <div class="space-y-2" id="options-${qi}">
        ${q.options.map((opt, oi) => `
          <button class="quiz-option w-full text-left"
                  data-qi="${qi}" data-oi="${oi}">
            <span class="option-letter font-mono text-xs text-muted w-5 shrink-0">
              ${['A','B','C','D'][oi]}.
            </span>
            <span>${escapeHtml(opt)}</span>
          </button>
        `).join('')}
      </div>
      <div id="explanation-${qi}" class="hidden mt-3 p-3 rounded-lg bg-white/5 text-xs text-gray-400 leading-relaxed border-l-2 border-violet">
        💡 ${escapeHtml(q.explanation || '')}
      </div>
    `;

    quizOutput.appendChild(card);
  });

  // ── Submit button ──
  const submitWrap       = document.createElement('div');
  submitWrap.className   = 'flex items-center justify-between mt-4';
  submitWrap.innerHTML   = `
    <p id="quiz-score-display" class="text-sm text-muted"></p>
    <button id="btn-submit-quiz" class="btn-primary text-sm px-6">
      Submit Quiz →
    </button>
  `;
  quizOutput.appendChild(submitWrap);

  // ── Reset button (hidden until submitted) ──
  const resetWrap       = document.createElement('div');
  resetWrap.id          = 'quiz-reset-wrap';
  resetWrap.className   = 'hidden text-center mt-3';
  resetWrap.innerHTML   = `
    <button id="btn-retry-quiz" class="btn-secondary text-sm px-6">↺ Retry Quiz</button>
  `;
  quizOutput.appendChild(resetWrap);

  // ── Wire option click handlers ──
  quizOutput.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => handleOptionClick(btn));
  });

  // ── Wire submit ──
  document.getElementById('btn-submit-quiz')
    ?.addEventListener('click', submitQuiz);

  // ── Wire retry ──
  document.getElementById('btn-retry-quiz')
    ?.addEventListener('click', () => generateQuiz(''));
}

// ═══════════════════════════════════════════════════════════
// QUIZ INTERACTION
// ═══════════════════════════════════════════════════════════

function handleOptionClick(btn) {
  if (quizState.submitted) return;

  const qi = parseInt(btn.dataset.qi);
  const oi = parseInt(btn.dataset.oi);

  // Deselect all options for this question
  document.querySelectorAll(`.quiz-option[data-qi="${qi}"]`)
    .forEach(b => b.classList.remove('selected-option'));

  // Select this one
  btn.classList.add('selected-option');
  quizState.answers[qi] = oi;

  // Visual feedback: highlight selected
  document.querySelectorAll(`.quiz-option[data-qi="${qi}"]`).forEach(b => {
    b.style.borderColor = b === btn ? 'rgba(139,92,246,0.6)' : '';
    b.style.background  = b === btn ? 'rgba(139,92,246,0.1)' : '';
  });

  // Update score display
  const answered = Object.keys(quizState.answers).length;
  const total    = quizState.questions.length;
  const scoreEl  = document.getElementById('quiz-score-display');
  if (scoreEl) scoreEl.textContent = `${answered} / ${total} answered`;
}

function submitQuiz() {
  if (quizState.submitted) return;
  quizState.submitted  = true;
  quizState.correctCount = 0;

  quizState.questions.forEach((q, qi) => {
    const chosen  = quizState.answers[qi];
    const correct = q.correct;

    const allOpts = document.querySelectorAll(`.quiz-option[data-qi="${qi}"]`);

    allOpts.forEach((btn, oi) => {
      btn.disabled = true;
      btn.style.borderColor = '';
      btn.style.background  = '';

      if (oi === correct) {
        btn.classList.add('correct');
      } else if (oi === chosen && oi !== correct) {
        btn.classList.add('wrong');
      }
    });

    if (chosen === correct) quizState.correctCount++;

    // Show explanation
    document.getElementById(`explanation-${qi}`)?.classList.remove('hidden');
  });

  // ── Final score card ──
  const pct    = Math.round((quizState.correctCount / quizState.questions.length) * 100);
  const medal  = pct >= 80 ? '🏆' : pct >= 60 ? '⭐' : '📖';
  const scoreEl = document.getElementById('quiz-score-display');
  if (scoreEl) {
    scoreEl.innerHTML = `
      ${medal} <strong class="${pct >= 80 ? 'text-emerald' : pct >= 60 ? 'text-violet' : 'text-amber-400'}">
        ${quizState.correctCount} / ${quizState.questions.length} correct (${pct}%)
      </strong>
    `;
  }

  // Hide submit, show retry
  document.getElementById('btn-submit-quiz')?.classList.add('hidden');
  document.getElementById('quiz-reset-wrap')?.classList.remove('hidden');

  // Save to stats
  const stats = DB.get('quiz_stats', { attempts: 0, totalCorrect: 0, totalQ: 0 });
  stats.attempts++;
  stats.totalCorrect += quizState.correctCount;
  stats.totalQ       += quizState.questions.length;
  DB.set('quiz_stats', stats);

  console.log(`[Quiz] Submitted — ${quizState.correctCount}/${quizState.questions.length} (${pct}%)`);
}

// ── Button event listeners ─────────────────────────────────
btnGenerateQuiz?.addEventListener('click', () => {
  const notes = quizNotesInput?.value.trim();
  if (!notes || notes.length < 20) {
    shakeElement(quizNotesInput);
    showToast('Please paste at least a few lines of notes first.', 'warn');
    return;
  }
  generateQuiz(notes);
});

btnDemoQuiz?.addEventListener('click', () => generateQuiz('demo'));


// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Shake animation for invalid input fields
 */
function shakeElement(el) {
  if (!el) return;
  el.style.transition = 'transform 0.08s ease';
  const keyframes = [
    { transform: 'translateX(0)' },
    { transform: 'translateX(-6px)' },
    { transform: 'translateX(6px)' },
    { transform: 'translateX(-4px)' },
    { transform: 'translateX(4px)' },
    { transform: 'translateX(0)' },
  ];
  el.animate(keyframes, { duration: 400, easing: 'ease-in-out' });
  el.focus();
}

/**
 * Toast notification
 * @param {string} msg
 * @param {'info'|'warn'|'error'|'success'} type
 */
function showToast(msg, type = 'info') {
  // Remove existing toasts
  document.querySelectorAll('.sm-toast').forEach(t => t.remove());

  const colors = {
    info:    'border-violet/40 bg-violet/10 text-violet-glow',
    warn:    'border-amber-500/40 bg-amber-500/10 text-amber-300',
    error:   'border-red-500/40 bg-red-500/10 text-red-300',
    success: 'border-emerald/40 bg-emerald/10 text-emerald',
  };

  const toast       = document.createElement('div');
  toast.className   = `sm-toast fixed top-5 right-5 z-50 px-4 py-3 rounded-xl border
                       backdrop-blur-md text-sm font-medium shadow-lg animate-slide-up
                       ${colors[type] || colors.info}`;
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity    = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 350);
  }, 3000);
}

// Export toast for other modules to use
export { showToast };

console.log('[Feynman+Quiz] Module loaded ✅');
