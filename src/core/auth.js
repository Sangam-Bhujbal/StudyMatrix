/**
 * auth.js — Guest Demo + Login + Register (client-side)
 * Default test account:
 *   email:    demo@studymatrix.app
 *   password: Demo@1234
 */

import { DB } from './local-db.js';

export const DEMO_CREDENTIALS = {
  email: 'demo@studymatrix.app',
  password: 'Demo@1234',
  name: 'Alex Demo',
  chronotype: 'morning',
};

const ACCOUNTS_KEY = 'accounts';
const SESSION_KEY  = 'session';

function hashPassword(password) {
  try {
    return btoa(unescape(encodeURIComponent(`sm::${password}`)));
  } catch {
    return `sm::${password}`;
  }
}

function seedDemoAccount() {
  const accounts = DB.get(ACCOUNTS_KEY, []);
  const exists = accounts.some(
    (a) => a.email.toLowerCase() === DEMO_CREDENTIALS.email.toLowerCase()
  );
  if (!exists) {
    accounts.push({
      email: DEMO_CREDENTIALS.email.toLowerCase(),
      passwordHash: hashPassword(DEMO_CREDENTIALS.password),
      name: DEMO_CREDENTIALS.name,
      chronotype: DEMO_CREDENTIALS.chronotype,
      createdAt: new Date().toISOString(),
      role: 'demo',
    });
    DB.set(ACCOUNTS_KEY, accounts);
  }
}

export function getSession() {
  return DB.get(SESSION_KEY, null);
}

export function getAccounts() {
  return DB.get(ACCOUNTS_KEY, []);
}

export function registerAccount({ name, email, password, chronotype }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName  = (name || '').trim();
  if (cleanName.length < 2) throw new Error('Name must be at least 2 characters.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error('Enter a valid email.');
  if ((password || '').length < 6) throw new Error('Password must be at least 6 characters.');

  const accounts = getAccounts();
  if (accounts.some((a) => a.email === cleanEmail)) {
    throw new Error('An account with this email already exists. Try logging in.');
  }

  const account = {
    email: cleanEmail,
    passwordHash: hashPassword(password),
    name: cleanName,
    chronotype: chronotype || 'morning',
    createdAt: new Date().toISOString(),
    role: 'user',
  };
  accounts.push(account);
  DB.set(ACCOUNTS_KEY, accounts);
  return account;
}

export function loginAccount(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const accounts = getAccounts();
  const account = accounts.find((a) => a.email === cleanEmail);
  if (!account || account.passwordHash !== hashPassword(password)) {
    throw new Error('Invalid email or password.');
  }
  return account;
}

export function createSession(account, mode = 'account') {
  const session = {
    email: account.email || null,
    name: account.name,
    chronotype: account.chronotype || 'morning',
    mode,
    loggedInAt: new Date().toISOString(),
  };
  DB.set(SESSION_KEY, session);
  DB.set('user', {
    name: session.name,
    chronotype: session.chronotype,
    email: session.email,
    mode,
  });
  return session;
}

export function logout() {
  DB.remove(SESSION_KEY);
}

export function fillDemoLoginFields() {
  const emailEl = document.getElementById('login-email');
  const passEl  = document.getElementById('login-password');
  if (emailEl) emailEl.value = DEMO_CREDENTIALS.email;
  if (passEl)  passEl.value  = DEMO_CREDENTIALS.password;
}

function switchAuthPanel(panel) {
  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.auth === panel);
  });
  document.querySelectorAll('.auth-panel').forEach((el) => {
    el.classList.toggle('hidden', el.id !== `auth-panel-${panel}`);
  });
}

function showAuthError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
}

function clearAuthError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.classList.add('hidden');
}

export function initAuthUI(bootApp) {
  seedDemoAccount();

  const overlay = document.getElementById('guest-modal-overlay');
  const session = getSession();

  if (session?.name) {
    bootApp(session);
    return;
  }

  overlay?.classList.remove('hidden');
  if (overlay) overlay.style.opacity = '1';

  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchAuthPanel(tab.dataset.auth));
  });

  document.getElementById('btn-fill-demo')?.addEventListener('click', () => {
    fillDemoLoginFields();
    switchAuthPanel('login');
  });

  document.getElementById('btn-login')?.addEventListener('click', () => {
    clearAuthError('login-error');
    try {
      const account = loginAccount(
        document.getElementById('login-email')?.value,
        document.getElementById('login-password')?.value
      );
      const sess = createSession(account, 'account');
      bootApp(sess);
    } catch (err) {
      showAuthError('login-error', err.message);
    }
  });

  document.getElementById('login-password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-login')?.click();
  });

  let registerChrono = 'morning';
  document.querySelectorAll('#auth-panel-register .chronotype-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#auth-panel-register .chronotype-btn')
        .forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      registerChrono = btn.dataset.type;
    });
  });

  document.getElementById('btn-register')?.addEventListener('click', () => {
    clearAuthError('register-error');
    try {
      const account = registerAccount({
        name: document.getElementById('reg-name')?.value,
        email: document.getElementById('reg-email')?.value,
        password: document.getElementById('reg-password')?.value,
        chronotype: registerChrono,
      });
      const sess = createSession(account, 'account');
      bootApp(sess);
    } catch (err) {
      showAuthError('register-error', err.message);
    }
  });

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    logout();
    window.location.reload();
  });

  const credEmail = document.getElementById('demo-cred-email');
  const credPass  = document.getElementById('demo-cred-pass');
  if (credEmail) credEmail.textContent = DEMO_CREDENTIALS.email;
  if (credPass)  credPass.textContent  = DEMO_CREDENTIALS.password;
}

seedDemoAccount();
console.log('[Auth] Login / Register / Demo session ready ✅');
