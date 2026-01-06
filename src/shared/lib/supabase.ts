import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js';
import type { LocalFolder, LocalSavedTab } from '../types';

// Supabase configuration
// These should be set in your environment or replaced with actual values
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Database types
export interface DbProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  settings: {
    inactive_threshold_hours: number;
    auto_archive_days: number;
    notification_enabled: boolean;
    theme: 'light' | 'dark' | 'system';
    sync_enabled: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface DbFolder {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface DbTab {
  id: string;
  user_id: string;
  folder_id: string | null;
  url: string;
  title: string;
  favicon_url: string | null;
  created_at: string;
  updated_at: string;
}

// Singleton Supabase client
let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase URL and Anon Key must be configured');
    }

    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        storage: {
          getItem: async (key: string): Promise<string | null> => {
            const result = await chrome.storage.local.get(key);
            return (result[key] as string) || null;
          },
          setItem: async (key: string, value: string): Promise<void> => {
            await chrome.storage.local.set({ [key]: value });
          },
          removeItem: async (key: string): Promise<void> => {
            await chrome.storage.local.remove(key);
          },
        },
      },
    });
  }
  return supabaseClient;
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// ============================================================================
// Auth Functions
// ============================================================================

export async function getSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function signInWithGoogle(): Promise<{ user: User | null; error: Error | null }> {
  try {
    // Use chrome.identity for Google OAuth in extensions
    const redirectUrl = chrome.identity.getRedirectURL();
    const supabase = getSupabaseClient();

    // Get the OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data.url) throw new Error('No OAuth URL returned');

    // Launch web auth flow with chrome.identity
    const responseUrl = await new Promise<string>((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: data.url,
          interactive: true,
        },
        (responseUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (responseUrl) {
            resolve(responseUrl);
          } else {
            reject(new Error('No response URL'));
          }
        }
      );
    });

    // Extract tokens or auth code from the response URL
    const url = new URL(responseUrl);
    const queryParams = new URLSearchParams(url.search);
    const hashParams = new URLSearchParams(url.hash.substring(1));
    const responseError = queryParams.get('error') || hashParams.get('error');
    const responseErrorDescription = queryParams.get('error_description') || hashParams.get('error_description');

    if (responseError) {
      throw new Error(
        responseErrorDescription ? `${responseError}: ${responseErrorDescription}` : responseError
      );
    }

    const code = queryParams.get('code') || hashParams.get('code');
    if (code) {
      const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
      return { user: exchangeData.user, error: null };
    }

    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (!accessToken) {
      throw new Error('No access token or authorization code in response');
    }

    // Set the session in Supabase
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    });

    if (sessionError) throw sessionError;

    return { user: sessionData.user, error: null };
  } catch (error) {
    console.error('[Supabase] Sign in error:', error);
    return { user: null, error: error as Error };
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
}

// ============================================================================
// Profile Functions
// ============================================================================

export async function getProfile(): Promise<DbProfile | null> {
  const supabase = getSupabaseClient();
  const user = await getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('[Supabase] Get profile error:', error);
    return null;
  }

  return data;
}

export async function updateProfile(updates: Partial<DbProfile>): Promise<boolean> {
  const supabase = getSupabaseClient();
  const user = await getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    console.error('[Supabase] Update profile error:', error);
    return false;
  }

  return true;
}

// ============================================================================
// Folder Functions
// ============================================================================

export async function getFolders(): Promise<DbFolder[]> {
  const supabase = getSupabaseClient();
  const user = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', user.id)
    .order('position', { ascending: true });

  if (error) {
    console.error('[Supabase] Get folders error:', error);
    return [];
  }

  return data || [];
}

export async function createFolder(folder: Omit<DbFolder, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<DbFolder | null> {
  const supabase = getSupabaseClient();
  const user = await getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('folders')
    .insert({
      ...folder,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Create folder error:', error);
    return null;
  }

  return data;
}

export async function updateFolder(id: string, updates: Partial<DbFolder>): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('folders')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('[Supabase] Update folder error:', error);
    return false;
  }

  return true;
}

export async function deleteFolder(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase] Delete folder error:', error);
    return false;
  }

  return true;
}

// ============================================================================
// Tab Functions
// ============================================================================

export async function getTabs(): Promise<DbTab[]> {
  const supabase = getSupabaseClient();
  const user = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('tabs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] Get tabs error:', error);
    return [];
  }

  return data || [];
}

export async function createTab(tab: Omit<DbTab, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<DbTab | null> {
  const supabase = getSupabaseClient();
  const user = await getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('tabs')
    .insert({
      ...tab,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Create tab error:', error);
    return null;
  }

  return data;
}

export async function createTabs(tabs: Omit<DbTab, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]): Promise<DbTab[]> {
  const supabase = getSupabaseClient();
  const user = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('tabs')
    .insert(tabs.map(tab => ({ ...tab, user_id: user.id })))
    .select();

  if (error) {
    console.error('[Supabase] Create tabs error:', error);
    return [];
  }

  return data || [];
}

export async function deleteTab(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('tabs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase] Delete tab error:', error);
    return false;
  }

  return true;
}

export async function searchTabs(query: string): Promise<DbTab[]> {
  const supabase = getSupabaseClient();
  const user = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .rpc('search_tabs', {
      search_query: query,
      user_uuid: user.id,
    });

  if (error) {
    console.error('[Supabase] Search tabs error:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// Sync Functions
// ============================================================================

export async function syncLocalToCloud(
  localFolders: LocalFolder[],
  localTabs: LocalSavedTab[]
): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;

  try {
    // Get existing cloud data
    const [cloudFolders, cloudTabs] = await Promise.all([
      getFolders(),
      getTabs(),
    ]);

    // Create folder ID mapping (local ID -> cloud ID)
    const folderIdMap = new Map<string, string>();

    // Sync folders
    for (const localFolder of localFolders) {
      const existing = cloudFolders.find(f => f.name === localFolder.name);
      if (existing) {
        folderIdMap.set(localFolder.id, existing.id);
      } else {
        const created = await createFolder({
          name: localFolder.name,
          icon: localFolder.icon,
          color: localFolder.color,
          position: localFolder.position,
        });
        if (created) {
          folderIdMap.set(localFolder.id, created.id);
        }
      }
    }

    // Sync tabs
    const existingUrls = new Set(cloudTabs.map(t => t.url));
    const newTabs = localTabs
      .filter(t => !existingUrls.has(t.url))
      .map(t => ({
        url: t.url,
        title: t.title,
        favicon_url: t.favicon_url,
        folder_id: t.folder_id ? (folderIdMap.get(t.folder_id) || null) : null,
      }));

    if (newTabs.length > 0) {
      await createTabs(newTabs);
    }

    console.log('[Supabase] Sync complete:', {
      foldersCreated: localFolders.length - cloudFolders.length,
      tabsCreated: newTabs.length,
    });

    return true;
  } catch (error) {
    console.error('[Supabase] Sync error:', error);
    return false;
  }
}

export async function syncCloudToLocal(): Promise<{
  folders: LocalFolder[];
  tabs: LocalSavedTab[];
} | null> {
  try {
    const [cloudFolders, cloudTabs] = await Promise.all([
      getFolders(),
      getTabs(),
    ]);

    // Convert to local format
    const folders: LocalFolder[] = cloudFolders.map(f => ({
      id: f.id,
      name: f.name,
      icon: f.icon,
      color: f.color,
      position: f.position,
      created_at: f.created_at,
    }));

    const tabs: LocalSavedTab[] = cloudTabs.map(t => ({
      id: t.id,
      url: t.url,
      title: t.title,
      favicon_url: t.favicon_url,
      folder_id: t.folder_id,
      session_id: null,
      created_at: t.created_at,
    }));

    return { folders, tabs };
  } catch (error) {
    console.error('[Supabase] Sync from cloud error:', error);
    return null;
  }
}
