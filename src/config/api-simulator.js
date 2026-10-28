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

const SIMULATED_DELAY_MS = 2500;

// ═══════════════════════════════════════════════════════════
// UTILITY — promise-based delay
// ═══════════════════════════════════════════════════════════
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ═══════════════════════════════════════════════════════════
// MOCK DATA BANK
// ═══════════════════════════════════════════════════════════

/** Mind-Map mock responses — keyed by topic slug */
const MOCK_MINDMAPS = {
  default: {
    title: 'Computer Science Fundamentals',
    mermaid: `mindmap
  root((CS Fundamentals))
    Data Structures
      Arrays & Strings
        Dynamic Arrays
        String Manipulation
      Linked Lists
        Singly Linked
        Doubly Linked
        Circular
      Trees
        Binary Search Tree
        AVL Tree
        Red-Black Tree
        Heap / Priority Queue
      Graphs
        BFS Traversal
        DFS Traversal
        Dijkstra Algorithm
        A* Pathfinding
      Hash Tables
        Collision Handling
        Open Addressing
        Chaining
    Algorithms
      Sorting
        Quick Sort O(n log n)
        Merge Sort O(n log n)
        Heap Sort O(n log n)
        Counting Sort O(n+k)
      Searching
        Binary Search
        Linear Search
        Interpolation Search
      Dynamic Programming
        Memoization
        Tabulation
        Classic Problems
      Divide & Conquer
        Recursion Trees
        Master Theorem
    Computer Architecture
      CPU Pipeline
        Fetch Decode Execute
        Branch Prediction
        Out-of-Order Exec
      Memory Hierarchy
        L1 L2 L3 Cache
        Virtual Memory
        Paging & Segmentation
      Parallelism
        Threads vs Processes
        Mutex & Semaphores
        Lock-Free Structures
    Operating Systems
      Process Management
        Scheduling Algorithms
        Context Switching
        Deadlock Prevention
      File Systems
        Inodes & Blocks
        Journaling
        B-Tree Index
      Networking Basics
        TCP/IP Stack
        HTTP & HTTPS
        Socket Programming`,
    nodeCount: 47,
    depth: 4,
  },

  physics: {
    title: 'Classical & Modern Physics',
    mermaid: `mindmap
  root((Physics))
    Classical Mechanics
      Kinematics
        Equations of Motion
        Projectile Motion
        Circular Motion
      Newton's Laws
        Inertia
        F = ma
        Action-Reaction
      Energy & Work
        Kinetic Energy
        Potential Energy
        Conservation Laws
      Rotational Motion
        Torque
        Angular Momentum
        Moment of Inertia
    Thermodynamics
      Laws of Thermodynamics
        Zeroth Law
        First Law
        Second Law
        Third Law
      Heat Engines
        Carnot Cycle
        Efficiency
      Entropy
        Disorder Concept
        Arrow of Time
    Electromagnetism
      Electric Fields
        Coulomb's Law
        Gauss's Law
        Electric Potential
      Magnetic Fields
        Biot-Savart Law
        Ampere's Law
        Faraday's Law
      Maxwell's Equations
        Wave Equations
        Speed of Light
    Modern Physics
      Special Relativity
        Time Dilation
        Length Contraction
        E = mc²
      Quantum Mechanics
        Wave-Particle Duality
        Heisenberg Uncertainty
        Schrödinger Equation
        Quantum Tunnelling
      Nuclear Physics
        Radioactive Decay
        Fission & Fusion
        Half-Life`,
    nodeCount: 52,
    depth: 4,
  },

  biology: {
    title: 'Cell Biology & Genetics',
    mermaid: `mindmap
  root((Biology))
    Cell Biology
      Cell Structure
        Nucleus
        Mitochondria
        Endoplasmic Reticulum
        Golgi Apparatus
        Ribosomes
        Lysosomes
      Cell Division
        Mitosis
          Prophase
          Metaphase
          Anaphase
          Telophase
        Meiosis
          Meiosis I
          Meiosis II
          Crossing Over
      Cell Signalling
        Receptor Proteins
        Signal Cascades
        Apoptosis
    Genetics
      DNA Structure
        Double Helix
        Base Pairing
        Nucleotides
      Gene Expression
        Transcription
        Translation
        Post-Translation
      Inheritance
        Mendel's Laws
        Dominant Recessive
        Codominance
        Sex-Linked Traits
      Mutations
        Point Mutations
        Frameshift
        Chromosomal
    Evolution
      Natural Selection
        Variation
        Fitness
        Adaptation
      Speciation
        Allopatric
        Sympatric
      Evidence
        Fossil Record
        Comparative Anatomy
        Molecular Evidence`,
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
  await wait(SIMULATED_DELAY_MS);
  const key = Object.keys(MOCK_MINDMAPS).find(k => topic.toLowerCase().includes(k)) || 'default';
  return { ...MOCK_MINDMAPS[key] };
}

/**
 * simulateFeynmanEval()
 * Simulates AI evaluation of a Feynman explanation.
 * @param {string} text - the user's explanation text
 * @returns {Promise<{accuracy, grade, verdict, strengths, gaps, resources}>}
 */
export async function simulateFeynmanEval(text = '') {
  await wait(SIMULATED_DELAY_MS);
  // Pick result based on word count (more words = higher score for realism)
  const words = text.trim().split(/\s+/).length;
  if (words > 120)       return { ...MOCK_FEYNMAN_EVALS[2] }; // A+
  else if (words > 50)   return { ...MOCK_FEYNMAN_EVALS[0] }; // A
  else                   return { ...MOCK_FEYNMAN_EVALS[1] }; // B+
}

/**
 * simulateQuizGeneration()
 * Simulates AI notes-to-quiz generation.
 * @param {string} notes - pasted study notes
 * @returns {Promise<{topic, questions[]}>}
 */
export async function simulateQuizGeneration(notes = '') {
  await wait(SIMULATED_DELAY_MS);
  return { ...MOCK_QUIZ_SETS[0] };
}

/**
 * simulateChatResponse()
 * Returns a context-aware bot reply for the current active tab.
 * @param {string} userMsg - user's chat message
 * @param {string} activeTab - current tab id (e.g. 'tab-mindmap')
 * @returns {Promise<string>}
 */
export async function simulateChatResponse(userMsg, activeTab) {
  await wait(800); // Chatbot feels faster — 0.8s
  const pool = CHATBOT_RESPONSES[activeTab] || CHATBOT_RESPONSES.default;

  // Keyword-aware response selection
  const msg = userMsg.toLowerCase();
  if (msg.includes('help') || msg.includes('how'))  return pool[1] || pool[0];
  if (msg.includes('tip')  || msg.includes('pro'))  return pool[2] || pool[0];
  if (msg.includes('why')  || msg.includes('what')) return pool[3] || pool[0];

  // Random pick from pool for variety
  return pool[Math.floor(Math.random() * pool.length)];
}

console.log('[API Simulator] Simulation engine loaded — all AI calls mocked ✅');
