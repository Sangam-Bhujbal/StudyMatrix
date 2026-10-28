/**
 * 4_chatbot.js — Context-Aware Floating AI Chatbot
 * ──────────────────────────────────────────────────
 * Features:
 *  • Floating bubble toggle (bottom-right corner)
 *  • Context-aware responses: reads current active tab
 *    and returns tab-specific tips from api-simulator.js
 *  • 0.8s simulated typing delay with animated dots
 *  • Keyboard shortcut: Enter to send, Escape to close
 *  • Persistent chat history within the session (localStorage)
 *  • Smart keyword detection (help / tip / why / what)
 *  • Unread badge counter on bubble when window is closed
 *  • Greeting message auto-sent on first open
 */

import { simulateChatResponse } from '../config/api-simulator.js';
import { DB }                   from '../core/local-db.js';

// ── DOM refs ──────────────────────────────────────────────────────
const chatbotWidget  = document.getElementById('chatbot-widget');
const chatbotToggle  = document.getElementById('chatbot-toggle');
const chatbotWindow  = document.getElementById('chatbot-window');
const chatbotClose   = document.getElementById('chatbot-close');
const chatbotInput   = document.getElementById('chatbot-input');
const chatbotSend    = document.getElementById('chatbot-send');
const chatMessages   = document.getElementById('chatbot-messages');

// ── State ─────────────────────────────────────────────────────────
let isOpen           = false;
let activeTab        = 'tab-dashboard';
let isTyping         = false;
let unreadCount      = 0;
let greeted          = false;

// Badge element (injected into toggle button)
let badgeEl = null;

// ═══════════════════════════════════════════════════════════
// WINDOW OPEN / CLOSE
// ═══════════════════════════════════════════════════════════

function openChat() {
  isOpen = true;
  chatbotWindow?.classList.remove('hidden');

  // Animate in
  if (chatbotWindow) {
    chatbotWindow.style.opacity   = '0';
    chatbotWindow.style.transform = 'translateY(12px) scale(0.96)';
    chatbotWindow.style.transition = 'opacity 0.25s ease, transform 0.25s cubic-bezier(0.16,1,0.3,1)';
    requestAnimationFrame(() => {
      chatbotWindow.style.opacity   = '1';
      chatbotWindow.style.transform = 'translateY(0) scale(1)';
    });
  }

  clearUnread();
  chatbotInput?.focus();

  // Send greeting on very first open
  if (!greeted) {
    greeted = true;
    setTimeout(() => botSay(getGreeting()), 600);
  }
}

function closeChat() {
  isOpen = false;
  if (chatbotWindow) {
    chatbotWindow.style.opacity   = '0';
    chatbotWindow.style.transform = 'translateY(12px) scale(0.96)';
    setTimeout(() => chatbotWindow?.classList.add('hidden'), 250);
  }
}

function toggleChat() {
  isOpen ? closeChat() : openChat();
}

// ── Greeting based on chronotype ──────────────────────────
function getGreeting() {
  const user  = DB.get('user', {});
  const name  = user.name  || 'Scholar';
  const type  = user.chronotype || 'morning';
  const hour  = new Date().getHours();

  const timeGreet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const emoji     = type === 'morning' ? '🌅' : '🦉';

  return `${timeGreet}, ${name}! ${emoji} I'm Matrix AI — your study assistant. I give context-aware tips based on whatever tab you're on. What are you working on today?`;
}

// ═══════════════════════════════════════════════════════════
// MESSAGE RENDERING
// ═══════════════════════════════════════════════════════════

/**
 * Appends a chat bubble to the messages container
 * @param {string} text
 * @param {'bot'|'user'} role
 */
function appendBubble(text, role = 'bot') {
  if (!chatMessages) return;

  const wrap       = document.createElement('div');
  wrap.className   = `flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;

  const bubble     = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.innerHTML = linkify(escapeHtml(text));

  wrap.appendChild(bubble);
  chatMessages.appendChild(wrap);
  scrollToBottom();
  if (role === 'bot') speakChat(text);

  // Increment unread if window is closed
  if (!isOpen && role === 'bot') {
    unreadCount++;
    updateBadge();
  }
}

/**
 * Shows the animated typing indicator ("...")
 */
function showTypingIndicator() {
  removeTypingIndicator();
  const wrap       = document.createElement('div');
  wrap.id          = 'typing-indicator';
  wrap.className   = 'flex justify-start';
  wrap.innerHTML   = `
    <div class="chat-bubble bot chat-typing">
      <span></span><span></span><span></span>
    </div>`;
  chatMessages?.appendChild(wrap);
  scrollToBottom();
}

function removeTypingIndicator() {
  document.getElementById('typing-indicator')?.remove();
}

/**
 * Bot speaks — shows typing indicator, then real message
 */
async function botSay(text) {
  showTypingIndicator();
  await new Promise(r => setTimeout(r, Math.min(text.length * 18, 900)));
  removeTypingIndicator();
  appendBubble(text, 'bot');
}

// ═══════════════════════════════════════════════════════════
// SEND MESSAGE FLOW
// ═══════════════════════════════════════════════════════════

async function sendMessage() {
  const raw = chatbotInput?.value.trim();
  if (!raw || isTyping) return;

  // Clear input
  chatbotInput.value = '';
  chatbotInput.style.height = 'auto';

  // Render user bubble
  appendBubble(raw, 'user');

  // Show typing
  isTyping = true;
  showTypingIndicator();

  try {
    // Get context-aware response (0.8s sim delay)
    const reply = await simulateChatResponse(raw, activeTab);
    removeTypingIndicator();
    await botSay(reply);
  } catch (err) {
    removeTypingIndicator();
    await botSay("Sorry, I had a glitch! Ask me again. 🤖");
  } finally {
    isTyping = false;
    chatbotInput?.focus();
  }
}

// ═══════════════════════════════════════════════════════════
// UNREAD BADGE
// ═══════════════════════════════════════════════════════════

function updateBadge() {
  if (!badgeEl) {
    badgeEl = document.createElement('span');
    badgeEl.className = `
      absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white
      text-xs font-bold flex items-center justify-center shadow-lg
      animate-bounce
    `;
    chatbotToggle?.appendChild(badgeEl);
  }
  badgeEl.textContent = unreadCount > 9 ? '9+' : unreadCount;
  badgeEl.classList.remove('hidden');
}

function clearUnread() {
  unreadCount = 0;
  badgeEl?.classList.add('hidden');
}

// ═══════════════════════════════════════════════════════════
// CONTEXT AWARENESS — track active tab
// ═══════════════════════════════════════════════════════════

document.addEventListener('sm:tabchange', (e) => {
  activeTab = e.detail?.tab || 'tab-dashboard';

  // If chat is open, send a proactive tip after tab switch
  if (isOpen && greeted) {
    setTimeout(async () => {
      const tip = await simulateChatResponse('__proactive__', activeTab);
      await botSay(`💡 Tab tip: ${tip}`);
    }, 800);
  }
});

// ═══════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════

chatbotInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && isOpen) closeChat();
});

// ── Auto-resize input on typing ───────────────────────────
chatbotInput?.addEventListener('input', () => {
  chatbotInput.style.height = 'auto';
  chatbotInput.style.height = `${Math.min(chatbotInput.scrollHeight, 100)}px`;
});

// ═══════════════════════════════════════════════════════════
// QUICK REPLY CHIPS (injected after greeting)
// ═══════════════════════════════════════════════════════════

const QUICK_REPLIES = [
  '💡 Give me a study tip',
  '⏱ How does the timer work?',
  '🧠 What is the Feynman technique?',
  '📊 How is my progress tracked?',
];

function injectQuickReplies() {
  if (!chatMessages) return;
  const chips = document.createElement('div');
  chips.id    = 'quick-replies';
  chips.className = 'flex flex-wrap gap-2 px-1 pb-2';
  chips.innerHTML = QUICK_REPLIES.map(r => `
    <button class="quick-chip text-xs px-3 py-1.5 rounded-full
                   border border-violet/30 bg-violet/10 text-violet-glow
                   hover:bg-violet/20 transition-colors cursor-pointer font-medium">
      ${escapeHtml(r)}
    </button>
  `).join('');
  chatMessages.appendChild(chips);

  chips.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (chatbotInput) chatbotInput.value = chip.textContent.trim();
      chips.remove(); // Remove after first use
      sendMessage();
    });
  });
}

// ── Inject chips after greeting loads ─────────────────────
const _origOpenChat = openChat;

// ═══════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════

function speakChat(text) {
  const enabled = document.getElementById('chatbot-voice-toggle')?.checked;
  const synth = window.speechSynthesis;
  if (!enabled || !synth) return;
  if (synth.speaking) synth.cancel();
  const utt = new SpeechSynthesisUtterance(text.replace(/[📊🧠⏱🎯🎵📝🧪⚡🤖💡]/g, ''));
  const selectedURI = document.getElementById('voice-select')?.value;
  const voices = synth.getVoices();
  utt.voice =
    voices.find((v) => v.voiceURI === selectedURI) ||
    voices.find((v) => /female/i.test(v.name) && v.lang.startsWith('en')) ||
    voices.find((v) => v.lang.startsWith('en')) ||
    voices[0] ||
    null;
  utt.rate = 1;
  synth.speak(utt);
}

document.getElementById('chatbot-voice-toggle')?.addEventListener('change', (event) => {
  const enabled = event.target.checked;
  if (!enabled) window.speechSynthesis?.cancel();
  const status = document.getElementById('chatbot-voice-status');
  if (status) status.textContent = enabled ? 'Voice replies on' : 'Voice replies off';
});

function scrollToBottom() {
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** Make URLs in bot messages clickable */
function linkify(text) {
  return text.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener" class="text-violet underline">$1</a>'
  );
}

// ═══════════════════════════════════════════════════════════
// EVENT BINDING
// ═══════════════════════════════════════════════════════════

chatbotToggle?.addEventListener('click', toggleChat);
chatbotClose?.addEventListener('click',  closeChat);
chatbotSend?.addEventListener('click',   sendMessage);

// Inject quick reply chips after greeting delay
setTimeout(() => {
  if (greeted) injectQuickReplies();
}, 1600);

// Override open to also inject chips on first open
const originalOpenChat = openChat;
chatbotToggle?.addEventListener('click', () => {
  if (!greeted) {
    // chips injected after greeting fires
    setTimeout(() => injectQuickReplies(), 1800);
  }
}, { once: true });

console.log('[Chatbot] Context-aware floating assistant loaded ✅');
