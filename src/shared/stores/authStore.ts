import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import {
  getUser,
  getSession,
  signInWithGoogle,
  signOut as supabaseSignOut,
  getProfile,
  isSupabaseConfigured,
  syncLocalToCloud,
  syncCloudToLocal,
  type DbProfile,
} from '../lib/supabase';
import type { LocalFolder, LocalSavedTab } from '../types';

interface AuthState {
  user: User | null;
  profile: DbProfile | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;

  // Actions
  initialize: () => Promise<void>;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  syncToCloud: () => Promise<boolean>;
  syncFromCloud: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,
  isConfigured: false,

  initialize: async () => {
    set({ loading: true, error: null });

    // Check if Supabase is configured
    const configured = isSupabaseConfigured();
    set({ isConfigured: configured });

    if (!configured) {
      set({ loading: false });
      console.log('[Auth] Supabase not configured, running in offline mode');
      return;
    }

    try {
      const session = await getSession();
      if (session) {
        const user = await getUser();
        const profile = await getProfile();
        set({ user, profile, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      console.error('[Auth] Initialize error:', error);
      set({ error: 'Failed to initialize auth', loading: false });
    }
  },

  signIn: async () => {
    set({ loading: true, error: null });

    try {
      const { user, error } = await signInWithGoogle();

      if (error) {
        set({ error: error.message, loading: false });
        return false;
      }

      if (user) {
        const profile = await getProfile();
        set({ user, profile, loading: false });

        // Sync local data to cloud after sign in
        await get().syncToCloud();

        return true;
      }

      set({ loading: false });
      return false;
    } catch (error) {
      console.error('[Auth] Sign in error:', error);
      set({ error: 'Sign in failed', loading: false });
      return false;
    }
  },

  signOut: async () => {
    set({ loading: true });
    try {
      await supabaseSignOut();
      set({ user: null, profile: null, loading: false });
    } catch (error) {
      console.error('[Auth] Sign out error:', error);
      set({ loading: false });
    }
  },

  refreshProfile: async () => {
    const profile = await getProfile();
    set({ profile });
  },

  syncToCloud: async () => {
    const { user } = get();
    if (!user) return false;

    try {
      // Get local data
      const result = await chrome.storage.local.get(['folders', 'saved_tabs']);
      const localFolders = (result.folders || []) as LocalFolder[];
      const localTabs = (result.saved_tabs || []) as LocalSavedTab[];

      // Sync to cloud
      const success = await syncLocalToCloud(localFolders, localTabs);
      return success;
    } catch (error) {
      console.error('[Auth] Sync to cloud error:', error);
      return false;
    }
  },

  syncFromCloud: async () => {
    const { user } = get();
    if (!user) return false;

    try {
      const cloudData = await syncCloudToLocal();
      if (!cloudData) return false;

      // Save to local storage
      await chrome.storage.local.set({
        folders: cloudData.folders,
        saved_tabs: cloudData.tabs,
      });

      return true;
    } catch (error) {
      console.error('[Auth] Sync from cloud error:', error);
      return false;
    }
  },
}));
