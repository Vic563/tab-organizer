import { create } from 'zustand';
import type { LocalFolder, LocalSavedTab } from '../types';

interface FolderState {
  folders: LocalFolder[];
  savedTabs: LocalSavedTab[];
  loading: boolean;
  error: string | null;

  // Actions
  loadFolders: () => Promise<void>;
  loadSavedTabs: () => Promise<void>;
  createFolder: (name: string, icon?: string, color?: string) => Promise<void>;
  updateFolder: (id: string, updates: Partial<LocalFolder>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  deleteSavedTab: (id: string) => Promise<void>;
  restoreTabs: (tabIds: string[]) => Promise<void>;
  getTabsByFolder: (folderId: string | null) => LocalSavedTab[];
  refreshAll: () => Promise<void>;
}

export const useFolderStore = create<FolderState>((set, get) => ({
  folders: [],
  savedTabs: [],
  loading: false,
  error: null,

  loadFolders: async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_FOLDERS' });
      if (response.success) {
        set({ folders: response.data as LocalFolder[] });
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  },

  loadSavedTabs: async () => {
    set({ loading: true, error: null });
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SAVED_TABS' });
      if (response.success) {
        set({ savedTabs: response.data as LocalSavedTab[], loading: false });
      } else {
        set({ error: response.error || 'Failed to load saved tabs', loading: false });
      }
    } catch {
      set({ error: 'Failed to load saved tabs', loading: false });
    }
  },

  createFolder: async (name: string, icon?: string, color?: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_FOLDER',
        payload: { name, icon, color },
      });
      if (response.success) {
        await get().loadFolders();
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  },

  updateFolder: async (id: string, updates: Partial<LocalFolder>) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_FOLDER',
        payload: { id, updates },
      });
      if (response.success) {
        await get().loadFolders();
      }
    } catch (error) {
      console.error('Failed to update folder:', error);
    }
  },

  deleteFolder: async (id: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_FOLDER',
        payload: { id },
      });
      if (response.success) {
        await get().loadFolders();
        await get().loadSavedTabs();
      }
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  },

  deleteSavedTab: async (id: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_SAVED_TAB',
        payload: { id },
      });
      if (response.success) {
        await get().loadSavedTabs();
      }
    } catch (error) {
      console.error('Failed to delete saved tab:', error);
    }
  },

  restoreTabs: async (tabIds: string[]) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'RESTORE_TABS',
        payload: { tabIds },
      });
      if (response.success) {
        await get().loadSavedTabs();
      }
    } catch (error) {
      console.error('Failed to restore tabs:', error);
    }
  },

  getTabsByFolder: (folderId: string | null) => {
    const { savedTabs } = get();
    return savedTabs.filter((tab) => tab.folder_id === folderId);
  },

  refreshAll: async () => {
    await Promise.all([get().loadFolders(), get().loadSavedTabs()]);
  },
}));
