/**
 * local-db.js — LocalStorage Adapter
 * Phase 1 stub. Full CRUD implementation in Phase 2.
 */
export const DB = {
  get:    (key, fallback = null) => {
    try { return JSON.parse(localStorage.getItem(`sm_${key}`)) ?? fallback; }
    catch { return fallback; }
  },
  set:    (key, val) => localStorage.setItem(`sm_${key}`, JSON.stringify(val)),
  remove: (key)      => localStorage.removeItem(`sm_${key}`),
  clear:  ()         => Object.keys(localStorage)
                          .filter(k => k.startsWith('sm_'))
                          .forEach(k => localStorage.removeItem(k)),
};
console.log('[StudyMatrix] LocalDB adapter ready');
