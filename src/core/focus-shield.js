/**
 * Full-screen focus shield: a distraction-free black clock with one exit action.
 */
const shield = document.getElementById('focus-shield');
const enterButton = document.getElementById('btn-enter-shield');
const exitButton = document.getElementById('btn-exit-shield');
const clock = document.getElementById('shield-clock');
let clockTimer = null;

function updateClock() {
  if (clock) {
    clock.textContent = new Intl.DateTimeFormat([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date());
  }
}

function setShield(active) {
  shield?.classList.toggle('hidden', !active);
  document.body.classList.toggle('shield-active', active);
  if (active) {
    updateClock();
    clockTimer = window.setInterval(updateClock, 1000);
    document.getElementById('chatbot-widget')?.classList.add('hidden');
  } else {
    window.clearInterval(clockTimer);
    clockTimer = null;
    document.getElementById('chatbot-widget')?.classList.remove('hidden');
  }
}

enterButton?.addEventListener('click', () => setShield(true));
exitButton?.addEventListener('click', () => setShield(false));

console.log('[FocusShield] Distraction-free shield loaded');
