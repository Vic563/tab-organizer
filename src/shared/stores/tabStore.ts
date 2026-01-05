import { create } from 'zustand';
import type { TabActivity, StaleTab } from '../types';

interface TabState {
  // Active tabs (currently open in browser)
  activeTabs: TabActivity[];
  staleTabs: StaleTab[];
  loading: boolean;
  error: string | null;

  // Actions
  loadActiveTabs: () => Promise<void>;
  loadStaleTabs: () => Promise<void>;
  saveTab: (tabId: number, folderId?: string) => Promise<void>;
  saveTabs: (tabIds: number[], folderId?: string) => Promise<void>;
  closeTab: (tabId: number) => Promise<void>;
  closeTabs: (tabIds: number[]) => Promise<void>;
  saveAndCloseTabs: (tabIds: number[], folderId?: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useTabStore = create<TabState>((set, get) => ({
  activeTabs: [],
  staleTabs: [],
  loading: false,
  error: null,

  loadActiveTabs: async () => {
    set({ loading: true, error: null });
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_TAB_ACTIVITY' });
      if (response.success) {
        const activityMap = response.data as Record<string, TabActivity>;
        const tabList = Object.values(activityMap).sort(
          (a, b) => b.last_active_at - a.last_active_at
        );
        set({ activeTabs: tabList, loading: false });
      } else {
        set({ error: response.error || 'Failed to load tabs', loading: false });
      }
    } catch (error) {
      set({ error: 'Failed to load tabs', loading: false });
    }
  },

  loadStaleTabs: async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STALE_TABS' });
      if (response.success) {
        set({ staleTabs: response.data as StaleTab[] });
      }
    } catch (error) {
      console.error('Failed to load stale tabs:', error);
    }
  },

  saveTab: async (tabId: number, folderId?: string) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'SAVE_TABS',
        payload: { tabIds: [tabId], folderId },
      });
    } catch (error) {
      console.error('Failed to save tab:', error);
    }
  },

  saveTabs: async (tabIds: number[], folderId?: string) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'SAVE_TABS',
        payload: { tabIds, folderId },
      });
    } catch (error) {
      console.error('Failed to save tabs:', error);
    }
  },

  closeTab: async (tabId: number) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'CLOSE_TABS',
        payload: [tabId],
      });
      // Refresh the tab list
      await get().loadActiveTabs();
    } catch (error) {
      console.error('Failed to close tab:', error);
    }
  },

  closeTabs: async (tabIds: number[]) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'CLOSE_TABS',
        payload: tabIds,
      });
      await get().loadActiveTabs();
    } catch (error) {
      console.error('Failed to close tabs:', error);
    }
  },

  saveAndCloseTabs: async (tabIds: number[], folderId?: string) => {
    try {
      await get().saveTabs(tabIds, folderId);
      await get().closeTabs(tabIds);
      await get().loadStaleTabs();
    } catch (error) {
      console.error('Failed to save and close tabs:', error);
    }
  },

  refreshAll: async () => {
    await Promise.all([get().loadActiveTabs(), get().loadStaleTabs()]);
  },
}));
