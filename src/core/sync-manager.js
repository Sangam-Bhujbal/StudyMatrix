/**
 * sync-manager.js — Hybrid LocalStorage + optional Supabase cloud sync
 * Always works offline. Cloud is optional if URL + anon key are saved.
 */

import { DB } from './local-db.js';

const URL_KEY = 'supabase_url';
const KEY_KEY = 'supabase_anon_key';

let client = null;
let lastStatus = { mode: 'local', message: 'Local-Only Mode' };

function toast(msg, type = 'info') {
  document.querySelectorAll('.sm-toast').forEach((t) => t.remove());
  const colors = {
    info: 'border-violet/40 bg-violet/10 text-violet-glow',
    warn: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    error: 'border-red-500/40 bg-red-500/10 text-red-300',
    success: 'border-emerald/40 bg-emerald/10 text-emerald',
  };
  const el = document.createElement('div');
  el.className = `sm-toast fixed top-5 right-5 z-50 px-4 py-3 rounded-xl border backdrop-blur-md text-sm font-medium shadow-lg animate-slide-up ${colors[type] || colors.info}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s ease';
    setTimeout(() => el.remove(), 350);
  }, 2800);
}

export function getCloudCredentials() {
  return {
    url: DB.get(URL_KEY, '') || localStorage.getItem('sm_supabase_url') || '',
    key: DB.get(KEY_KEY, '') || localStorage.getItem('sm_supabase_anon_key') || '',
  };
}

export function saveCloudCredentials(url, key) {
  DB.set(URL_KEY, (url || '').trim());
  DB.set(KEY_KEY, (key || '').trim());
}

export function isSimulatorEnabled() {
  const flag = DB.get('use_simulator', true);
  return flag !== false;
}

export function setSimulatorEnabled(on) {
  DB.set('use_simulator', !!on);
}

function updateBadge() {
  const badge = document.getElementById('cloud-sync-badge');
  const settingsStatus = document.getElementById('settings-sync-status');
  const label = lastStatus.mode === 'cloud' ? '☁ Cloud Sync' : '💾 Local-Only Mode';
  if (badge) {
    badge.textContent = label;
    badge.classList.toggle('sync-cloud', lastStatus.mode === 'cloud');
    badge.classList.toggle('sync-local', lastStatus.mode !== 'cloud');
  }
  if (settingsStatus) settingsStatus.textContent = lastStatus.message;
}

export async function initSyncManager() {
  const { url, key } = getCloudCredentials();
  const urlInput = document.getElementById('supabase-url');
  const keyInput = document.getElementById('supabase-key');
  if (urlInput) urlInput.value = url;
  if (keyInput) keyInput.value = key;

  if (url && key && window.supabase?.createClient) {
    try {
      client = window.supabase.createClient(url, key);
      const { error } = await client.from('study_sessions').select('id').limit(1);
      if (error) {
        lastStatus = {
          mode: 'local',
          message: `Cloud reachable, table missing — staying Local-Only (${error.message})`,
        };
        client = null;
      } else {
        lastStatus = { mode: 'cloud', message: 'Connected to Supabase · study_sessions' };
        await pushLocalSessions();
      }
    } catch (err) {
      client = null;
      lastStatus = { mode: 'local', message: `Cloud unavailable — ${err.message}` };
    }
  } else {
    lastStatus = { mode: 'local', message: 'Local-Only Mode · add Supabase URL + key to enable cloud' };
  }

  updateBadge();
  return lastStatus;
}

export async function syncStudySession(session) {
  const sessions = DB.get('focus_sessions', []);
  sessions.unshift({ ...session, id: session.id || `sess_${Date.now()}` });
  DB.set('focus_sessions', sessions.slice(0, 100));

  if (!client) return { ok: true, mode: 'local' };

  try {
    const user = DB.get('user', {});
    const { error } = await client.from('study_sessions').insert({
      user_email: user.email || 'guest',
      user_name: user.name || 'Guest',
      mode: session.mode,
      duration_min: session.duration,
      tab_switches: session.tabSwitchCount || 0,
      created_at: new Date().toISOString(),
    });
    if (error) throw error;
    return { ok: true, mode: 'cloud' };
  } catch (err) {
    lastStatus = { mode: 'local', message: `Cloud write failed — saved locally` };
    updateBadge();
    return { ok: true, mode: 'local', error: err.message };
  }
}

async function pushLocalSessions() {
  if (!client) return;
  const sessions = DB.get('focus_sessions', []);
  if (!sessions.length) return;
  const user = DB.get('user', {});
  const rows = sessions.slice(0, 20).map((s) => ({
    user_email: user.email || 'guest',
    user_name: user.name || 'Guest',
    mode: s.mode,
    duration_min: s.duration,
    tab_switches: s.tabSwitchCount || 0,
    created_at: s.at || new Date().toISOString(),
  }));
  await client.from('study_sessions').insert(rows).then(() => {}).catch(() => {});
}

export function collectBackupPayload() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'StudyMatrix',
    version: 1,
    data: {},
  };
  Object.keys(localStorage).forEach((k) => {
    if (k.startsWith('sm_')) {
      try {
        payload.data[k] = JSON.parse(localStorage.getItem(k));
      } catch {
        payload.data[k] = localStorage.getItem(k);
      }
    }
  });
  return payload;
}

export function exportDataAsJSON() {
  const blob = new Blob([JSON.stringify(collectBackupPayload(), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'studymatrix_backup.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('Backup downloaded: studymatrix_backup.json', 'success');
}

export function resetDemoData() {
  const confirmed = window.confirm(
    'Reset all StudyMatrix data in this browser? This cannot be undone.'
  );
  if (!confirmed) return;

  DB.clear();
  window.location.reload();
}

export async function importDataFromJSON(file) {
  if (!file) throw new Error('Choose a JSON backup file.');
  const text = await file.text();
  const parsed = JSON.parse(text);
  const data = parsed.data || parsed;
  Object.entries(data).forEach(([k, v]) => {
    if (!k.startsWith('sm_')) return;
    localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  });
  toast('Backup imported. Reloading…', 'success');
  setTimeout(() => window.location.reload(), 700);
}

export function bindSettingsSyncUI() {
  const simToggle = document.getElementById('toggle-api-sim');
  if (simToggle) {
    simToggle.checked = isSimulatorEnabled();
    simToggle.addEventListener('change', () => {
      setSimulatorEnabled(simToggle.checked);
      toast(simToggle.checked ? 'AI simulation ON (2s mock delay)' : 'Simulation OFF — still using mock fallback', 'info');
    });
  }

  document.getElementById('btn-save-supabase')?.addEventListener('click', async () => {
    saveCloudCredentials(
      document.getElementById('supabase-url')?.value,
      document.getElementById('supabase-key')?.value
    );
    toast('Credentials saved. Testing connection…', 'info');
    await initSyncManager();
    toast(lastStatus.message, lastStatus.mode === 'cloud' ? 'success' : 'warn');
  });

  document.getElementById('btn-export-json')?.addEventListener('click', exportDataAsJSON);
  document.getElementById('btn-reset-demo')?.addEventListener('click', resetDemoData);

  const importInput = document.getElementById('import-json-file');
  document.getElementById('btn-import-json')?.addEventListener('click', () => importInput?.click());
  importInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    try {
      await importDataFromJSON(file);
    } catch (err) {
      toast(err.message || 'Import failed', 'error');
    }
  });
}

document.addEventListener('sm:timerEnd', (e) => {
  syncStudySession({
    mode: e.detail?.mode,
    duration: e.detail?.duration,
    tabSwitchCount: e.detail?.tabSwitchCount,
    at: new Date().toISOString(),
  });
});

console.log('[Sync] Hybrid LocalStorage / Supabase manager loaded ✅');
