/**
 * api-simulator.js — StudyMatrix AI Simulation Wrapper
 * ─────────────────────────────────────────────────────
 * Every AI feature routes through this file.
 * In demo mode: shows realistic loading UI for 2500ms,
 * then returns hardcoded mock JSON that looks 100% real.
 *
 * To plug in a real Gemini API key later, just swap the
 * mock return inside each function with a real fetch() call.
 */

const SIMULATED_DELAY_MS = 2000;

// ═══════════════════════════════════════════════════════════
// UTILITY — promise-based delay
// ═══════════════════════════════════════════════════════════
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function requestLiveAI(type, input) {
  if (typeof window === 'undefined' || !window.fetch) return null;
  try {
    if (JSON.parse(window.localStorage.getItem('sm_use_simulator')) === true) return null;
  } catch {
    // Missing or malformed local preference means live mode may be attempted.
  }
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, input }),
  });
  if (!response.ok) throw new Error(`AI endpoint returned ${response.status}`);
  const payload = await response.json();
  return payload.result || null;
}

async function liveOrFallback(type, input, fallback) {
  try {
    const live = await requestLiveAI(type, input);
    if (live) return live;
  } catch (error) {
    console.warn(`[AI] ${type} unavailable; using demo fallback`, error.message);
  }
  await wait(SIMULATED_DELAY_MS);
  return fallback();
}

// ═══════════════════════════════════════════════════════════
// MOCK DATA BANK
// ═══════════════════════════════════════════════════════════

/** Mind-Map mock responses — keyed by topic slug */
const MOCK_MINDMAPS = {
  default: {
    title: 'Computer Science Fundamentals',
    mermaid: `graph TD
  ROOT["CS Fundamentals"]
  ROOT --> DS["Data Structures"]
  ROOT --> ALG["Algorithms"]
  ROOT --> ARCH["Computer Architecture"]
  ROOT --> OS["Operating Systems"]
  DS --> ARR["Arrays & Strings"]
  DS --> LL["Linked Lists"]
  DS --> TR["Trees"]
  DS --> GR["Graphs"]
  DS --> HT["Hash Tables"]
  ARR --> DA["Dynamic Arrays"]
  ARR --> SM["String Manipulation"]
  LL --> SLL["Singly Linked"]
  LL --> DLL["Doubly Linked"]
  TR --> BST["Binary Search Tree"]
  TR --> AVL["AVL Tree"]
  TR --> HEAP["Heap / Priority Queue"]
  GR --> BFS["BFS Traversal"]
  GR --> DFS["DFS Traversal"]
  GR --> DIJ["Dijkstra Algorithm"]
  HT --> COL["Collision Handling"]
  HT --> OA["Open Addressing"]
  ALG --> SORT["Sorting"]
  ALG --> SRCH["Searching"]
  ALG --> DP["Dynamic Programming"]
  ALG --> DAC["Divide & Conquer"]
  SORT --> QS["Quick Sort"]
  SORT --> MS["Merge Sort"]
  SRCH --> BS["Binary Search"]
  DP --> MEMO["Memoization"]
  DP --> TAB["Tabulation"]
  ARCH --> CPU["CPU Pipeline"]
  ARCH --> MEM["Memory Hierarchy"]
  ARCH --> PAR["Parallelism"]
  CPU --> FDE["Fetch Decode Execute"]
  MEM --> CACHE["L1 L2 L3 Cache"]
  OS --> PROC["Process Management"]
  OS --> FS["File Systems"]
  OS --> NET["Networking"]
  PROC --> SCHED["Scheduling Algorithms"]
  NET --> TCP["TCP/IP Stack"]`,
    nodeCount: 47,
    depth: 4,
  },

  physics: {
    title: 'Classical & Modern Physics',
    mermaid: `graph TD
  ROOT["Physics"]
  ROOT --> CM["Classical Mechanics"]
  ROOT --> TH["Thermodynamics"]
  ROOT --> EM["Electromagnetism"]
  ROOT --> MP["Modern Physics"]
  CM --> KIN["Kinematics"]
  CM --> NL["Newton's Laws"]
  CM --> EW["Energy & Work"]
  CM --> ROT["Rotational Motion"]
  KIN --> EOM["Equations of Motion"]
  KIN --> PROJ["Projectile Motion"]
  NL --> FMA["F = ma"]
  EW --> KE["Kinetic Energy"]
  EW --> PE["Potential Energy"]
  TH --> LAWS["Laws of Thermodynamics"]
  TH --> ENG["Heat Engines"]
  TH --> ENT["Entropy"]
  EM --> EF["Electric Fields"]
  EM --> MF["Magnetic Fields"]
  EM --> MX["Maxwell's Equations"]
  MP --> REL["Special Relativity"]
  MP --> QM["Quantum Mechanics"]
  MP --> NUC["Nuclear Physics"]
  REL --> EMC["E = mc²"]
  QM --> SCH["Schrödinger Equation"]`,
    nodeCount: 52,
    depth: 4,
  },

  biology: {
    title: 'Cell Biology & Genetics',
    mermaid: `graph TD
  ROOT["Biology"]
  ROOT --> CB["Cell Biology"]
  ROOT --> GEN["Genetics"]
  ROOT --> EVO["Evolution"]
  CB --> STR["Cell Structure"]
  CB --> DIV["Cell Division"]
  CB --> SIG["Cell Signalling"]
  STR --> NUC["Nucleus"]
  STR --> MIT["Mitochondria"]
  DIV --> MITO["Mitosis"]
  DIV --> MEI["Meiosis"]
  GEN --> DNA["DNA Structure"]
  GEN --> EXP["Gene Expression"]
  GEN --> INH["Inheritance"]
  DNA --> HELIX["Double Helix"]
  EXP --> TX["Transcription"]
  EXP --> TL["Translation"]
  INH --> MEN["Mendel's Laws"]
  EVO --> NS["Natural Selection"]
  EVO --> SP["Speciation"]`,
    nodeCount: 55,
    depth: 4,
  },
};

/** Feynman evaluation mock responses */
const MOCK_FEYNMAN_EVALS = [
  {
    accuracy:   88,
    grade:      'A',
    verdict:    'Excellent conceptual grasp. Minor gaps in edge cases.',
    strengths: [
      'Clear explanation of core mechanism with correct analogies',
      'Good use of real-world examples to illustrate the concept',
      'Logical flow from basic principle to complex application',
      'Correctly identified the key variables and their relationships',
    ],
    gaps: [
      'Did not mention the boundary conditions / limiting cases',
      'Missing the mathematical relationship between key variables',
      'Edge case when input approaches zero was not addressed',
    ],
    resources: [
      'Khan Academy — topic fundamentals (free)',
      'MIT OpenCourseWare — lecture notes PDF',
      'Feynman Lectures Vol. 1 — Chapter 3',
    ],
  },
  {
    accuracy:   72,
    grade:      'B+',
    verdict:    'Solid foundation. Some core concepts need deeper exploration.',
    strengths: [
      'Correctly identified the main components and their roles',
      'Used an intuitive analogy that simplifies the concept well',
      'Showed understanding of cause-and-effect relationships',
    ],
    gaps: [
      'The explanation of the underlying mechanism is incomplete',
      'Confused correlation with causation in the third paragraph',
      'Key terminology was used incorrectly in two instances',
      'The energy conservation aspect was entirely omitted',
    ],
    resources: [
      '3Blue1Brown — visual explanation (YouTube)',
      'Crash Course — 8-minute overview',
      'CK-12 — interactive textbook chapter',
    ],
  },
  {
    accuracy:   95,
    grade:      'A+',
    verdict:    'Expert-level explanation. Almost publication-ready.',
    strengths: [
      'Flawless step-by-step breakdown from first principles',
      'Correctly handles all edge cases and boundary conditions',
      'Precise use of domain-specific terminology throughout',
      'Connected micro-level mechanisms to macro-level outcomes',
      'Original analogy is creative and pedagogically accurate',
    ],
    gaps: [
      'Could briefly mention the historical context / discovery',
    ],
    resources: [
      'You are ready — attempt past paper questions on this topic!',
    ],
  },
];

/** Quiz mock questions */
const MOCK_QUIZ_SETS = [
  {
    topic: 'General Study Notes',
    questions: [
      {
        q:       'Which of the following best describes the concept explained in the notes?',
        options: [
          'A process driven by differential equations',
          'A state machine with discrete transitions',
          'An iterative approximation algorithm',
          'A declarative data transformation pipeline',
        ],
        correct: 0,
        explanation: 'The notes describe a process fundamentally governed by differential relationships between variables.',
      },
      {
        q:       'What is the primary advantage of the approach described?',
        options: [
          'Lower time complexity compared to brute force',
          'Guaranteed optimal solution in all cases',
          'Reduced memory footprint via lazy evaluation',
          'Parallelisable across independent subproblems',
        ],
        correct: 0,
        explanation: 'The key advantage highlighted is the reduction in time complexity from exponential to polynomial.',
      },
      {
        q:       'Under which condition does the described method FAIL to converge?',
        options: [
          'When the learning rate exceeds a critical threshold',
          'When input data is perfectly normalised',
          'When the objective function is convex',
          'When batch size is set to 1',
        ],
        correct: 0,
        explanation: 'Convergence failure occurs when the learning rate is too high, causing oscillation around the minimum.',
      },
      {
        q:       'Which real-world system is the BEST analogy for the mechanism described?',
        options: [
          'Water flowing downhill to find the lowest point',
          'A sorted binary search tree lookup',
          'A distributed hash table ring',
          'A finite state automaton parser',
        ],
        correct: 0,
        explanation: 'Gradient descent, like water flowing downhill, always moves in the direction of steepest descent.',
      },
      {
        q:       'What does the key variable represent in the context of the notes?',
        options: [
          'The rate of change of the objective function',
          'The absolute maximum of the solution space',
          'The number of recursive function calls',
          'The index of the current processing epoch',
        ],
        correct: 0,
        explanation: 'In this context the variable tracks the instantaneous rate of change — the gradient.',
      },
    ],
  },
];

/** Chatbot context-aware responses */
export const CHATBOT_RESPONSES = {
  'tab-dashboard': [
    "Your dashboard shows your study stats at a glance! Sessions, focus time, and mind-maps all tracked here. 📊",
    "Pro tip: Your chronotype determines your peak focus windows. Morning Birds should tackle hard topics before noon!",
    "You can navigate to any module from the sidebar. Where would you like to start today? 🎯",
    "I can see you're on the Dashboard. Try generating a Mind-Map first — it's the best way to start a new topic!",
  ],
  'tab-mindmap': [
    "The Mind-Map generator uses AI to extract key concepts from your syllabus PDF and build a visual knowledge graph! 🧠",
    "Pro tip: Upload a dense PDF — the denser the content, the richer the mind-map nodes will be.",
    "Mermaid.js renders the mind-map as an interactive diagram. You can zoom and pan to explore all nodes!",
    "Try the Demo button if you don't have a PDF handy — it generates a full CS Fundamentals mind-map!",
  ],
  'tab-timer': [
    "The Pomodoro technique (25m work / 5m break) is scientifically proven to maximise focus and retention. ⏱",
    "I'll alert you if you switch tabs during a session! Stay locked in — your future self will thank you. 🎯",
    "Try layering Brown Noise + 432Hz for the ultimate deep work soundscape. Many top performers swear by it!",
    "Your audio mixer uses the Web Audio API — all synthesised locally, no downloads needed! 🎵",
  ],
  'tab-focus': [
    "Focus Terminal is live. Pick a coach voice — Goggins, Mentor, Drill, or Zen — then start the radial timer.",
    "Tab-switch detection logs a Focus Breach. Come back immediately if you leave mid-session.",
    "Layer 432Hz binaural tones with rain for a dual-audio flow state.",
    "Pause early and the selected coach will call you out. Stay in the chair.",
  ],
  'tab-settings': [
    "Settings is your backup bay: export JSON, import on another device, or plug in Supabase for cloud sync.",
    "Without a Supabase URL and anon key, StudyMatrix stays 100% Local-Only — that's the demo-safe default.",
    "Keep AI Simulation ON for hackathon demos so every feature returns rich mock results after 2 seconds.",
    "Demo login is demo@studymatrix.app / Demo@1234 if a judge needs a saved account.",
  ],
  'tab-feynman': [
    "The Feynman Technique: if you can't explain it simply, you don't understand it yet. This module finds the gaps! 📝",
    "Type your explanation as if you're teaching a 10-year-old. The AI will find concepts you glossed over.",
    "The Notes-to-Quiz generator turns passive notes into active recall practice — 2× better retention proven! 🧪",
    "After your evaluation, focus your next study session on the 'Missing Points' section. That's your knowledge gap!",
  ],
  'tab-bionic': [
    "Bionic Reading bolds the first syllables of words — your brain auto-completes the rest 2× faster! ⚡",
    "Paste any article, textbook chapter, or study notes to activate bionic mode instantly.",
    "Research shows bionic typography can increase reading speed by 20-40% after a short adaptation period!",
    "Try pasting a paragraph you find difficult to focus on — bionic mode anchors your eyes to the bold guides.",
  ],
  'tab-schedule': [
    "Your adaptive schedule is built around your chronotype! Morning Birds get hard tasks at 6:30 AM. 🌅",
    "Add all your subjects with weekly hour targets — the AI distributes them across your peak focus windows.",
    "Pro tip: Schedule your hardest subject first during your peak chronotype window for maximum retention!",
    "Your schedule is saved locally and updates as you complete sessions. It gets smarter over time! 🤖",
  ],
  default: [
    "I'm Matrix AI — your context-aware study assistant! I adapt my tips to whatever module you're using. 🤖",
    "Ask me anything about study strategies, the features here, or how to use StudyMatrix!",
    "Need help? I can guide you through any feature. What are you working on right now?",
  ],
};

// ═══════════════════════════════════════════════════════════
// PUBLIC API — Simulation Functions
// ═══════════════════════════════════════════════════════════

/**
 * simulateMindMap()
 * Simulates AI mind-map generation from a PDF/topic.
 * @param {string} topic - detected topic slug ('physics', 'biology', or 'default')
 * @returns {Promise<{title, mermaid, nodeCount, depth}>}
 */
export async function simulateMindMap(topic = 'default') {
  return liveOrFallback('mindmap', String(topic || 'default'), () => {
    const blob = String(topic || 'default').toLowerCase();
    const key = Object.keys(MOCK_MINDMAPS).find(k => blob.includes(k)) || 'default';
    const result = { ...MOCK_MINDMAPS[key] };
    result.missing_concepts = result.missing_concepts || [];
    return result;
  });
}

/** Alias expected by newer feature wiring */
export async function simulateMindmapGeneration(text = '') {
  return simulateMindMap(text);
}

/**
 * simulateFeynmanEval()
 * Simulates AI evaluation of a Feynman explanation.
 * @param {string} text - the user's explanation text
 * @returns {Promise<{accuracy, grade, verdict, strengths, gaps, resources}>}
 */
function toEvalPayload(raw) {
  return {
    ...raw,
    score: raw.accuracy,
    missing_concepts: raw.gaps,
    suggestions: raw.resources,
  };
}

export async function simulateFeynmanEval(text = '') {
  return liveOrFallback('feynman', text, () => {
    const words = text.trim().split(/\s+/).length;
    if (words > 120) return toEvalPayload({ ...MOCK_FEYNMAN_EVALS[2] });
    if (words > 50)  return toEvalPayload({ ...MOCK_FEYNMAN_EVALS[0] });
    return toEvalPayload({ ...MOCK_FEYNMAN_EVALS[1] });
  });
}

export async function simulateFeynmanEvaluation(text = '') {
  return simulateFeynmanEval(text);
}

/**
 * simulateQuizGeneration()
 * Simulates AI notes-to-quiz generation.
 * @param {string} notes - pasted study notes
 * @returns {Promise<{topic, questions[]}>}
 */
export async function simulateQuizGeneration(notes = '') {
  return liveOrFallback('quiz', notes, () => {
    const set = MOCK_QUIZ_SETS[0];
    return { topic: set.topic, questions: set.questions.slice(0, 3) };
  });
}

/**
 * simulateChatResponse()
 * Returns a context-aware bot reply for the current active tab.
 * @param {string} userMsg - user's chat message
 * @param {string} activeTab - current tab id (e.g. 'tab-mindmap')
 * @returns {Promise<string>}
 */
export async function simulateChatResponse(userMsg, activeTab) {
  return liveOrFallback('chat', { message: userMsg, activeTab }, () => {
    const pool = CHATBOT_RESPONSES[activeTab] || CHATBOT_RESPONSES.default;
    const msg = userMsg.toLowerCase();
    if (msg.includes('help') || msg.includes('how')) return pool[1] || pool[0];
    if (msg.includes('tip') || msg.includes('pro')) return pool[2] || pool[0];
    if (msg.includes('why') || msg.includes('what')) return pool[3] || pool[0];
    return pool[Math.floor(Math.random() * pool.length)];
  });
}

console.log('[API Simulator] Simulation engine loaded — all AI calls mocked ✅');
