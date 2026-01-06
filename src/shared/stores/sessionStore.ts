import { create } from 'zustand';
import type { SmartSession, TabGroup, LocalSavedTab } from '../types';

interface SessionState {
  smartSessions: SmartSession[];
  tabGroups: TabGroup[];
  archivedTabs: LocalSavedTab[];
  loading: boolean;
  error: string | null;

  loadSmartSessions: () => Promise<void>;
  loadTabGroups: () => Promise<void>;
  loadArchivedTabs: () => Promise<void>;
  saveSessionAsFolder: (sessionId: string, folderName: string) => Promise<void>;
  archiveTabsNow: () => Promise<void>;
  bulkDeleteSavedTabs: (tabIds: string[]) => Promise<void>;
  bulkRestoreTabs: (tabIds: string[]) => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  smartSessions: [],
  tabGroups: [],
  archivedTabs: [],
  loading: false,
  error: null,

  loadSmartSessions: async () => {
    set({ loading: true, error: null });
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SMART_SESSIONS' });
      if (response.success) {
        set({ smartSessions: response.data as SmartSession[], loading: false });
      } else {
        set({ error: response.error || 'Failed to load sessions', loading: false });
      }
    } catch {
      set({ error: 'Failed to load sessions', loading: false });
    }
  },

  loadTabGroups: async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_TAB_GROUPS' });
      if (response.success) {
        set({ tabGroups: response.data as TabGroup[] });
      }
    } catch (error) {
      console.error('Failed to load tab groups:', error);
    }
  },

  loadArchivedTabs: async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_ARCHIVED_TABS' });
      if (response.success) {
        set({ archivedTabs: response.data as LocalSavedTab[] });
      }
    } catch (error) {
      console.error('Failed to load archived tabs:', error);
    }
  },

  saveSessionAsFolder: async (sessionId: string, folderName: string) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'SAVE_SESSION_AS_FOLDER',
        payload: { sessionId, folderName },
      });
      await get().loadSmartSessions();
    } catch (error) {
      console.error('Failed to save session as folder:', error);
    }
  },

  archiveTabsNow: async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'ARCHIVE_TABS_NOW' });
      await get().loadArchivedTabs();
    } catch (error) {
      console.error('Failed to archive tabs:', error);
    }
  },

  bulkDeleteSavedTabs: async (tabIds: string[]) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'BULK_DELETE_SAVED_TABS',
        payload: { tabIds },
      });
    } catch (error) {
      console.error('Failed to bulk delete tabs:', error);
    }
  },

  bulkRestoreTabs: async (tabIds: string[]) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'BULK_RESTORE_TABS',
        payload: { tabIds },
      });
    } catch (error) {
      console.error('Failed to bulk restore tabs:', error);
    }
  },

  refreshAll: async () => {
    await Promise.all([
      get().loadSmartSessions(),
      get().loadTabGroups(),
      get().loadArchivedTabs(),
    ]);
  },
}));
