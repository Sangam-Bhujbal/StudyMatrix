/**
 * 7_settings.js — Settings tab helpers (simulation, cloud, backup)
 */
import { bindSettingsSyncUI, initSyncManager } from '../core/sync-manager.js';

bindSettingsSyncUI();
initSyncManager();

console.log('[Settings] Cloud sync + backup controls ready ✅');
