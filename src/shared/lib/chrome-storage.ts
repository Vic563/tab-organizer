/**
 * Chrome Storage Wrapper
 *
 * Provides typed access to chrome.storage.local with async/await support.
 */

import type {
  StorageKey,
  TabActivity,
  StaleTab,
  UserSettings,
  Session,
  Folder,
} from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';

type StorageData = {
  tab_activity: Record<string, TabActivity>;
  stale_tabs: StaleTab[];
  user_settings: UserSettings;
  supabase_session: {
    access_token: string;
    refresh_token: string;
  } | null;
  sync_queue: SyncOperation[];
  saved_tabs: SavedTabLocal[];
  sessions: Session[];
  folders: Folder[];
};

interface SavedTabLocal {
  id: string;
  url: string;
  title: string;
  favicon_url: string | null;
  created_at: string;
  session_id: string | null;
  folder_id: string | null;
}

interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: 'tabs' | 'sessions' | 'folders';
  data: unknown;
  timestamp: number;
}

const defaultValues: StorageData = {
  tab_activity: {},
  stale_tabs: [],
  user_settings: DEFAULT_SETTINGS,
  supabase_session: null,
  sync_queue: [],
  saved_tabs: [],
  sessions: [],
  folders: [],
};

/**
 * Get a value from chrome.storage.local
 */
export async function getStorage<K extends StorageKey>(
  key: K
): Promise<StorageData[K]> {
  const result = await chrome.storage.local.get(key);
  return (result[key] as StorageData[K]) ?? defaultValues[key];
}

/**
 * Get multiple values from chrome.storage.local
 */
export async function getStorageMultiple<K extends StorageKey>(
  keys: K[]
): Promise<Pick<StorageData, K>> {
  const result = await chrome.storage.local.get(keys);
  const output = {} as Pick<StorageData, K>;

  for (const key of keys) {
    output[key] = (result[key] as StorageData[K]) ?? defaultValues[key];
  }

  return output;
}

/**
 * Set a value in chrome.storage.local
 */
export async function setStorage<K extends StorageKey>(
  key: K,
  value: StorageData[K]
): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

/**
 * Set multiple values in chrome.storage.local
 */
export async function setStorageMultiple(
  data: Partial<StorageData>
): Promise<void> {
  await chrome.storage.local.set(data);
}

/**
 * Remove a key from chrome.storage.local
 */
export async function removeStorage(key: StorageKey): Promise<void> {
  await chrome.storage.local.remove(key);
}

/**
 * Clear all data from chrome.storage.local
 */
export async function clearStorage(): Promise<void> {
  await chrome.storage.local.clear();
}

/**
 * Listen for changes to specific keys in chrome.storage
 */
export function onStorageChange<K extends StorageKey>(
  key: K,
  callback: (newValue: StorageData[K], oldValue: StorageData[K]) => void
): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName !== 'local') return;
    if (key in changes) {
      callback(
        (changes[key].newValue as StorageData[K]) ?? defaultValues[key],
        (changes[key].oldValue as StorageData[K]) ?? defaultValues[key]
      );
    }
  };

  chrome.storage.onChanged.addListener(listener);

  // Return unsubscribe function
  return () => chrome.storage.onChanged.removeListener(listener);
}

/**
 * Get storage usage info
 */
export async function getStorageUsage(): Promise<{
  bytesInUse: number;
  quota: number;
  percentUsed: number;
}> {
  const bytesInUse = await chrome.storage.local.getBytesInUse();
  // chrome.storage.local has a 10MB quota (10 * 1024 * 1024 bytes)
  const quota = 10 * 1024 * 1024;
  const percentUsed = (bytesInUse / quota) * 100;

  return { bytesInUse, quota, percentUsed };
}

export type { StorageData, SavedTabLocal, SyncOperation };
