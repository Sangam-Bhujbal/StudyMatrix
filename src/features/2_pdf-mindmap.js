/**
 * 2_pdf-mindmap.js — AI Mind-Map Module
 * ───────────────────────────────────────
 * Flow:
 *  1. User uploads a PDF → pdf.js extracts raw text
 *  2. Topic is detected from extracted text keywords
 *  3. simulateMindMap() called → 2.5s loading state shown
 *  4. Mock Mermaid.js diagram rendered in UI
 *
 * Also handles the "Run Demo" button (no PDF needed).
 */

import { simulateMindMap } from '../config/api-simulator.js';
import { DB }              from '../core/local-db.js';

// ── DOM refs ────────────────────────────────────────────────
const pdfUploadInput    = document.getElementById('pdf-upload');
const pdfFilenameEl     = document.getElementById('pdf-filename');
const btnDemoMindmap    = document.getElementById('btn-demo-mindmap');
const mindmapLoading    = document.getElementById('mindmap-loading');
const mindmapOutput     = document.getElementById('mindmap-output');
const mermaidContainer  = document.getElementById('mermaid-canvas')
  || document.getElementById('mermaid-container');
const btnGenerateMindmap = document.getElementById('btn-generate-mindmap');
const mindmapTextInput   = document.getElementById('mindmap-text');

// ── Mermaid init ────────────────────────────────────────────
window.mermaid?.initialize({
  startOnLoad:  false,
  theme:        'dark',
  themeVariables: {
    darkMode:         true,
    background:       '#1a1d26',
    mainBkg:          '#12151c',
    nodeBorder:       '#8b5cf6',
    lineColor:        '#8b5cf6',
    fontFamily:       'Inter, system-ui, sans-serif',
    fontSize:         '13px',
    primaryColor:     '#1a1d26',
    primaryTextColor: '#f3f4f6',
    primaryBorderColor: '#8b5cf6',
    edgeLabelBackground: '#12151c',
    clusterBkg:       '#12151c',
    titleColor:       '#a78bfa',
    nodeTextColor:    '#f3f4f6',
  },
  mindmap: {
    padding: 20,
  },
});

// ── PDF.js worker setup ─────────────────────────────────────
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ═══════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Extracts text from a PDF File object using pdf.js
 * @param {File} file
 * @returns {Promise<string>} extracted plain text
 */
async function extractPDFText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf         = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText      = '';

  for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
    // Cap at 10 pages for demo speed
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str).join(' ');
    fullText      += strings + '\n';
  }

  return fullText;
}

/**
 * Detects a topic keyword from extracted PDF text
 * @param {string} text
 * @returns {string} topic slug
 */
function detectTopic(text) {
  const lower = text.toLowerCase();
  if (lower.includes('physics') || lower.includes('quantum') || lower.includes('relativity')) return 'physics';
  if (lower.includes('biology') || lower.includes('cell')    || lower.includes('genetics'))   return 'biology';
  if (lower.includes('chemistry') || lower.includes('organic') || lower.includes('periodic')) return 'chemistry';
  return 'default'; // CS / General
}

/**
 * Shows the loading state, calls simulator, then renders mind-map
 * @param {string} topic - detected or default topic slug
 * @param {string} label - display label for the loading message
 */
async function generateMindMap(topic = 'default', label = 'document') {
  // 1 — Show loading, hide output
  mindmapLoading?.classList.remove('hidden');
  mindmapOutput?.classList.add('hidden');
  if (mermaidContainer) mermaidContainer.innerHTML = '';

  // 2 — Update loading text
  const loadingText = mindmapLoading?.querySelector('p:first-of-type');
  if (loadingText) loadingText.textContent = `AI is analysing ${label}...`;

  try {
    // 3 — Simulate AI call (2.5s delay + mock data)
    const result = await simulateMindMap(topic);

    // 4 — Render with Mermaid.js
    await renderMermaid(result.mermaid);

    // 5 — Show output panel
    mindmapLoading?.classList.add('hidden');
    mindmapOutput?.classList.remove('hidden');

    // 6 — Add metadata badges
    appendMindMapMeta(result);

    // 7 — Persist to stats
    const stats = DB.get('stats', { sessions: 0, focusMinutes: 0, topics: 0 });
    stats.topics = (stats.topics || 0) + 1;
    DB.set('stats', stats);
    updateDashboardStats(stats);

    console.log(`[MindMap] Rendered: ${result.title} (${result.nodeCount} nodes)`);

  } catch (err) {
    console.error('[MindMap] Render error:', err);
    mindmapLoading?.classList.add('hidden');
    showMindMapError(err.message);
  }
}

/**
 * Renders a Mermaid diagram string into the container
 * @param {string} diagramSrc - Mermaid diagram source
 */
async function renderMermaid(diagramSrc) {
  if (!mermaidContainer) throw new Error('Mind-map canvas missing');
  mermaidContainer.innerHTML = '';

  const renderId = `mmd-render-${Date.now()}`;
  const div = document.createElement('div');
  div.style.display = 'flex';
  div.style.justifyContent = 'center';
  mermaidContainer.appendChild(div);

  try {
    if (!window.mermaid) throw new Error('Mermaid CDN not loaded');
    const { svg } = await window.mermaid.render(renderId, diagramSrc);
    div.innerHTML = svg;

    // Make SVG responsive
    const svgEl = div.querySelector('svg');
    if (svgEl) {
      svgEl.style.maxWidth  = '100%';
      svgEl.style.height    = 'auto';
      svgEl.removeAttribute('width');
      svgEl.removeAttribute('height');
    }
  } catch (renderErr) {
    // Fallback: show raw mermaid as code block
    div.innerHTML = `
      <div class="text-center text-gray-400 py-8">
        <p class="text-red-400 text-sm mb-2">⚠️ SVG render failed — showing source</p>
        <pre class="text-left text-xs text-gray-400 bg-obsidian p-4 rounded-lg overflow-auto max-h-64">${escapeHtml(diagramSrc)}</pre>
      </div>`;
    console.warn('[MindMap] Mermaid SVG fallback triggered:', renderErr);
  }
}

/**
 * Appends node count and depth metadata below the diagram
 */
function appendMindMapMeta(result) {
  // Remove old meta if present
  document.getElementById('mindmap-meta')?.remove();

  const meta = document.createElement('div');
  meta.id    = 'mindmap-meta';
  meta.className = 'flex flex-wrap gap-3 mt-4 pt-4 border-t border-white/10';
  meta.innerHTML = `
    <div class="flex items-center gap-2 text-xs text-gray-400">
      <span class="w-2 h-2 rounded-full bg-violet inline-block"></span>
      <strong class="text-white">${result.nodeCount}</strong> concepts mapped
    </div>
    <div class="flex items-center gap-2 text-xs text-gray-400">
      <span class="w-2 h-2 rounded-full bg-emerald inline-block"></span>
      <strong class="text-white">${result.depth}</strong> levels deep
    </div>
    <div class="flex items-center gap-2 text-xs text-gray-400">
      <span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
      Topic: <strong class="text-white">${result.title}</strong>
    </div>
    <button id="btn-export-mindmap"
            class="ml-auto btn-secondary text-xs px-3 py-1.5 rounded-lg">
      📋 Copy Mermaid Source
    </button>
  `;
  mindmapOutput?.appendChild(meta);

  // Copy source button
  document.getElementById('btn-export-mindmap')?.addEventListener('click', () => {
    navigator.clipboard.writeText(result.mermaid).then(() => {
      const btn = document.getElementById('btn-export-mindmap');
      if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => { btn.textContent = '📋 Copy Mermaid Source'; }, 2000); }
    });
  });
}

/**
 * Shows an inline error card
 */
function showMindMapError(msg) {
  mindmapOutput?.classList.remove('hidden');
  mermaidContainer.innerHTML = `
    <div class="text-center py-10">
      <p class="text-red-400 font-semibold mb-2">⚠️ Generation Failed</p>
      <p class="text-gray-500 text-sm">${escapeHtml(msg)}</p>
      <button onclick="location.reload()" class="btn-secondary text-sm mt-4 px-4 py-2">Retry</button>
    </div>`;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function updateDashboardStats(stats) {
  const el = document.getElementById('stat-topics');
  if (el) el.textContent = stats.topics || 0;
}

// ═══════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════

// 1 — PDF Upload
pdfUploadInput?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Show filename
  if (pdfFilenameEl) {
    pdfFilenameEl.textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
    pdfFilenameEl.classList.remove('hidden');
  }

  try {
    // Extract text and detect topic
    const text  = await extractPDFText(file);
    const topic = detectTopic(text);
    await generateMindMap(topic, file.name);
  } catch (err) {
    console.error('[MindMap] PDF extraction error:', err);
    await generateMindMap('default', file.name); // Fallback gracefully
  }
});

// 2 — Demo Button (no PDF needed)
btnDemoMindmap?.addEventListener('click', async () => {
  if (pdfFilenameEl) {
    pdfFilenameEl.textContent = '🎭 Running demo — CS Fundamentals syllabus';
    pdfFilenameEl.classList.remove('hidden');
  }
  await generateMindMap('default', 'demo syllabus');
});

btnGenerateMindmap?.addEventListener('click', async () => {
  const text = mindmapTextInput?.value.trim() || '';
  const topic = text ? detectTopic(text) : 'default';
  await generateMindMap(topic, text ? 'pasted syllabus' : 'demo syllabus');
});

// ── Load saved stats on init ─────────────────────────────
const savedStats = DB.get('stats', { sessions: 0, focusMinutes: 0, topics: 0 });
updateDashboardStats(savedStats);

console.log('[MindMap] Module loaded ✅');
