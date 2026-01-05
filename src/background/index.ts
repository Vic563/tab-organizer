/**
 * Background Service Worker
 *
 * CRITICAL: All event listeners must be registered synchronously at the top level.
 * Service workers terminate after 30 seconds of inactivity - use chrome.alarms
 * instead of setTimeout/setInterval.
 */

import type { TabActivity, Message, MessageResponse, StaleTab, UserSettings, LocalFolder, LocalSavedTab } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';

// Type for tab activity storage
type TabActivityMap = Record<string, TabActivity>;

// ============================================================================
// Event Listeners (registered synchronously at module load)
// ============================================================================

// Tab events
chrome.tabs.onActivated.addListener(handleTabActivated);
chrome.tabs.onUpdated.addListener(handleTabUpdated);
chrome.tabs.onRemoved.addListener(handleTabRemoved);

// Alarm events
chrome.alarms.onAlarm.addListener(handleAlarm);

// Lifecycle events
chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onStartup.addListener(handleStartup);

// Message passing
chrome.runtime.onMessage.addListener(handleMessage);

// ============================================================================
// Lifecycle Handlers
// ============================================================================

async function handleInstalled(details: chrome.runtime.InstalledDetails) {
  console.log('[TabOrganizer] Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    // First-time setup
    await initializeExtension();
  } else if (details.reason === 'update') {
    // Handle migration if needed
    console.log('[TabOrganizer] Updated from version:', details.previousVersion);
  }

  // Always ensure alarms exist after install/update
  await ensureAlarmsExist();
}

async function handleStartup() {
  console.log('[TabOrganizer] Browser startup');
  // Alarms may be cleared on browser restart - recreate them
  await ensureAlarmsExist();
  // Sync current tab state
  await syncCurrentTabs();
}

async function initializeExtension() {
  // Set default settings
  await chrome.storage.local.set({
    user_settings: DEFAULT_SETTINGS,
    tab_activity: {},
    stale_tabs: [],
    saved_tabs: [],
    sessions: [],
    folders: [],
    sync_queue: [],
  });

  console.log('[TabOrganizer] Initialized with default settings');
}

async function ensureAlarmsExist() {
  // Check for inactive tabs every 30 minutes
  const checkAlarm = await chrome.alarms.get('check-inactive-tabs');
  if (!checkAlarm) {
    await chrome.alarms.create('check-inactive-tabs', {
      periodInMinutes: 30,
      delayInMinutes: 1, // Start first check after 1 minute
    });
    console.log('[TabOrganizer] Created check-inactive-tabs alarm');
  }

  // Cloud sync every 5 minutes
  const syncAlarm = await chrome.alarms.get('cloud-sync');
  if (!syncAlarm) {
    await chrome.alarms.create('cloud-sync', {
      periodInMinutes: 5,
      delayInMinutes: 2,
    });
    console.log('[TabOrganizer] Created cloud-sync alarm');
  }
}

// ============================================================================
// Tab Event Handlers
// ============================================================================

async function handleTabActivated(activeInfo: { tabId: number; windowId: number }) {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab.url || tab.url.startsWith('chrome://')) return;

    const now = Date.now();
    const result = await chrome.storage.local.get('tab_activity');
    const tab_activity = (result.tab_activity || {}) as TabActivityMap;

    // Update or create activity record for this tab
    const activity: TabActivity = tab_activity[activeInfo.tabId] || {
      chrome_tab_id: activeInfo.tabId,
      url: tab.url,
      title: tab.title || '',
      favicon_url: tab.favIconUrl || null,
      last_active_at: now,
      total_active_time_ms: 0,
      visit_count: 0,
      window_id: activeInfo.windowId,
    };

    activity.last_active_at = now;
    activity.visit_count += 1;
    activity.url = tab.url;
    activity.title = tab.title || '';
    activity.favicon_url = tab.favIconUrl || null;

    tab_activity[activeInfo.tabId] = activity;
    await chrome.storage.local.set({ tab_activity });
  } catch (error) {
    console.error('[TabOrganizer] Error handling tab activation:', error);
  }
}

async function handleTabUpdated(
  tabId: number,
  changeInfo: { url?: string; title?: string },
  tab: chrome.tabs.Tab
) {
  // Only track when URL or title changes (page load complete)
  if (!changeInfo.url && !changeInfo.title) return;
  if (!tab.url || tab.url.startsWith('chrome://')) return;

  try {
    const result = await chrome.storage.local.get('tab_activity');
    const tab_activity = (result.tab_activity || {}) as TabActivityMap;

    if (tab_activity[tabId]) {
      tab_activity[tabId].url = tab.url;
      tab_activity[tabId].title = tab.title || '';
      tab_activity[tabId].favicon_url = tab.favIconUrl || null;
      await chrome.storage.local.set({ tab_activity });
    }
  } catch (error) {
    console.error('[TabOrganizer] Error handling tab update:', error);
  }
}

async function handleTabRemoved(tabId: number) {
  try {
    const result = await chrome.storage.local.get('tab_activity');
    const tab_activity = (result.tab_activity || {}) as TabActivityMap;

    if (tab_activity[tabId]) {
      delete tab_activity[tabId];
      await chrome.storage.local.set({ tab_activity });
    }
  } catch (error) {
    console.error('[TabOrganizer] Error handling tab removal:', error);
  }
}

// ============================================================================
// Alarm Handlers
// ============================================================================

async function handleAlarm(alarm: chrome.alarms.Alarm) {
  console.log('[TabOrganizer] Alarm fired:', alarm.name);

  switch (alarm.name) {
    case 'check-inactive-tabs':
      await checkForInactiveTabs();
      break;
    case 'cloud-sync':
      await performCloudSync();
      break;
  }
}

async function checkForInactiveTabs() {
  try {
    const result = await chrome.storage.local.get(['tab_activity', 'user_settings']);
    const tab_activity = (result.tab_activity || {}) as TabActivityMap;
    const settings = (result.user_settings || DEFAULT_SETTINGS) as UserSettings;

    const thresholdMs = settings.inactive_threshold_hours * 60 * 60 * 1000;
    const now = Date.now();
    const staleTabs: StaleTab[] = [];

    for (const [tabIdStr, activity] of Object.entries(tab_activity)) {
      const inactiveMs = now - activity.last_active_at;

      if (inactiveMs > thresholdMs) {
        // Verify tab still exists
        try {
          await chrome.tabs.get(parseInt(tabIdStr));
          staleTabs.push({
            chrome_tab_id: activity.chrome_tab_id,
            url: activity.url,
            title: activity.title,
            favicon_url: activity.favicon_url,
            inactive_hours: Math.floor(inactiveMs / (60 * 60 * 1000)),
          });
        } catch {
          // Tab no longer exists, clean up
          delete tab_activity[tabIdStr];
        }
      }
    }

    // Update storage
    await chrome.storage.local.set({
      tab_activity,
      stale_tabs: staleTabs,
    });

    // Update badge if we have stale tabs
    if (staleTabs.length > 0) {
      await chrome.action.setBadgeText({ text: staleTabs.length.toString() });
      await chrome.action.setBadgeBackgroundColor({ color: '#F59E0B' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }

    console.log('[TabOrganizer] Found', staleTabs.length, 'inactive tabs');
  } catch (error) {
    console.error('[TabOrganizer] Error checking inactive tabs:', error);
  }
}

async function performCloudSync() {
  // TODO: Implement cloud sync with Supabase
  console.log('[TabOrganizer] Cloud sync triggered (not implemented yet)');
}

// ============================================================================
// Message Handlers
// ============================================================================

function handleMessage(
  message: Message,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponse) => void
): boolean {
  // Return true to indicate we'll respond asynchronously
  handleMessageAsync(message).then(sendResponse);
  return true;
}

async function handleMessageAsync(message: Message): Promise<MessageResponse> {
  console.log('[TabOrganizer] Received message:', message.type);

  try {
    switch (message.type) {
      case 'GET_STALE_TABS': {
        const result = await chrome.storage.local.get('stale_tabs');
        return { success: true, data: result.stale_tabs || [] };
      }

      case 'GET_TAB_ACTIVITY': {
        const result = await chrome.storage.local.get('tab_activity');
        return { success: true, data: result.tab_activity || {} };
      }

      case 'SAVE_TABS': {
        const payload = message.payload as { tabIds: number[]; folderId?: string };
        await saveTabs(payload.tabIds, payload.folderId);
        return { success: true };
      }

      case 'CLOSE_TABS': {
        const tabIds = message.payload as number[];
        await chrome.tabs.remove(tabIds);
        return { success: true };
      }

      case 'SYNC_NOW': {
        await performCloudSync();
        return { success: true };
      }

      case 'GET_FOLDERS': {
        const result = await chrome.storage.local.get('folders');
        return { success: true, data: result.folders || [] };
      }

      case 'CREATE_FOLDER': {
        const { name, icon, color } = message.payload as { name: string; icon?: string; color?: string };
        await createFolder(name, icon, color);
        return { success: true };
      }

      case 'UPDATE_FOLDER': {
        const { id, updates } = message.payload as { id: string; updates: Partial<LocalFolder> };
        await updateFolder(id, updates);
        return { success: true };
      }

      case 'DELETE_FOLDER': {
        const { id } = message.payload as { id: string };
        await deleteFolder(id);
        return { success: true };
      }

      case 'GET_SAVED_TABS': {
        const result = await chrome.storage.local.get('saved_tabs');
        return { success: true, data: result.saved_tabs || [] };
      }

      case 'DELETE_SAVED_TAB': {
        const { id } = message.payload as { id: string };
        await deleteSavedTab(id);
        return { success: true };
      }

      case 'RESTORE_TABS': {
        const { tabIds } = message.payload as { tabIds: string[] };
        await restoreTabs(tabIds);
        return { success: true };
      }

      default:
        return { success: false, error: 'Unknown message type' };
    }
  } catch (error) {
    console.error('[TabOrganizer] Error handling message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// Tab Operations
// ============================================================================

async function saveTabs(tabIds: number[], folderId?: string) {
  const result = await chrome.storage.local.get('saved_tabs');
  const saved_tabs = (result.saved_tabs || []) as LocalSavedTab[];

  for (const tabId of tabIds) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab.url) continue;

      saved_tabs.push({
        id: crypto.randomUUID(),
        url: tab.url,
        title: tab.title || '',
        favicon_url: tab.favIconUrl || null,
        created_at: new Date().toISOString(),
        session_id: null,
        folder_id: folderId || null,
      });
    } catch {
      // Tab doesn't exist anymore
    }
  }

  await chrome.storage.local.set({ saved_tabs });
}

// ============================================================================
// Folder Operations
// ============================================================================

async function createFolder(name: string, icon?: string, color?: string) {
  const result = await chrome.storage.local.get('folders');
  const folders = (result.folders || []) as LocalFolder[];

  const newFolder: LocalFolder = {
    id: crypto.randomUUID(),
    name,
    icon: icon || null,
    color: color || null,
    position: folders.length,
    created_at: new Date().toISOString(),
  };

  folders.push(newFolder);
  await chrome.storage.local.set({ folders });
  console.log('[TabOrganizer] Created folder:', name);
}

async function updateFolder(id: string, updates: Partial<LocalFolder>) {
  const result = await chrome.storage.local.get('folders');
  const folders = (result.folders || []) as LocalFolder[];

  const index = folders.findIndex((f) => f.id === id);
  if (index !== -1) {
    folders[index] = { ...folders[index], ...updates };
    await chrome.storage.local.set({ folders });
    console.log('[TabOrganizer] Updated folder:', id);
  }
}

async function deleteFolder(id: string) {
  const result = await chrome.storage.local.get(['folders', 'saved_tabs']);
  const folders = (result.folders || []) as LocalFolder[];
  const saved_tabs = (result.saved_tabs || []) as LocalSavedTab[];

  // Remove folder
  const updatedFolders = folders.filter((f) => f.id !== id);

  // Remove folder_id from tabs in this folder (move to unfiled)
  const updatedTabs = saved_tabs.map((tab) =>
    tab.folder_id === id ? { ...tab, folder_id: null } : tab
  );

  await chrome.storage.local.set({
    folders: updatedFolders,
    saved_tabs: updatedTabs,
  });
  console.log('[TabOrganizer] Deleted folder:', id);
}

async function deleteSavedTab(id: string) {
  const result = await chrome.storage.local.get('saved_tabs');
  const saved_tabs = (result.saved_tabs || []) as LocalSavedTab[];

  const updatedTabs = saved_tabs.filter((t) => t.id !== id);
  await chrome.storage.local.set({ saved_tabs: updatedTabs });
  console.log('[TabOrganizer] Deleted saved tab:', id);
}

async function restoreTabs(tabIds: string[]) {
  const result = await chrome.storage.local.get('saved_tabs');
  const saved_tabs = (result.saved_tabs || []) as LocalSavedTab[];

  const tabsToRestore = saved_tabs.filter((t) => tabIds.includes(t.id));

  // Open each tab
  for (const tab of tabsToRestore) {
    await chrome.tabs.create({ url: tab.url, active: false });
  }

  // Optionally remove from saved (or keep for history)
  // For now, keep them saved
  console.log('[TabOrganizer] Restored', tabsToRestore.length, 'tabs');
}

async function syncCurrentTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    const result = await chrome.storage.local.get('tab_activity');
    const tab_activity = (result.tab_activity || {}) as TabActivityMap;
    const now = Date.now();

    for (const tab of tabs) {
      if (!tab.id || !tab.url || tab.url.startsWith('chrome://')) continue;

      if (!tab_activity[tab.id]) {
        tab_activity[tab.id] = {
          chrome_tab_id: tab.id,
          url: tab.url,
          title: tab.title || '',
          favicon_url: tab.favIconUrl || null,
          last_active_at: now,
          total_active_time_ms: 0,
          visit_count: 1,
          window_id: tab.windowId,
        };
      }
    }

    // Clean up tabs that no longer exist
    const existingTabIds = new Set(tabs.map(t => t.id));
    for (const tabId of Object.keys(tab_activity)) {
      if (!existingTabIds.has(parseInt(tabId))) {
        delete tab_activity[tabId];
      }
    }

    await chrome.storage.local.set({ tab_activity });
    console.log('[TabOrganizer] Synced', Object.keys(tab_activity).length, 'tabs');
  } catch (error) {
    console.error('[TabOrganizer] Error syncing tabs:', error);
  }
}
