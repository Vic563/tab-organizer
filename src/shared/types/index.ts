// User types
export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  settings: UserSettings;
}

export interface UserSettings {
  inactive_threshold_hours: number;
  auto_archive_days: number;
  notification_enabled: boolean;
  theme: 'light' | 'dark' | 'system';
  sync_enabled: boolean;
}

// Tab types
export interface Tab {
  id: string;
  user_id: string;
  session_id: string | null;
  folder_id: string | null;
  url: string;
  title: string;
  favicon_url: string | null;
  last_accessed_at: string;
  created_at: string;
  is_active: boolean;
  chrome_tab_id: number | null;
  position: number;
}

export interface SavedTab extends Omit<Tab, 'chrome_tab_id' | 'is_active'> {
  is_active: false;
}

// Session types
export interface Session {
  id: string;
  user_id: string;
  folder_id: string | null;
  name: string;
  description: string | null;
  auto_generated: boolean;
  topic_tags: string[];
  created_at: string;
  updated_at: string;
  tab_count: number;
}

// Folder types
export interface Folder {
  id: string;
  user_id: string;
  parent_folder_id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

// Archive types
export interface ArchivedTab {
  id: string;
  user_id: string;
  original_tab_id: string;
  url: string;
  title: string;
  favicon_url: string | null;
  session_name: string | null;
  folder_name: string | null;
  archived_at: string;
  original_created_at: string;
}

// Local tracking types (not synced to cloud)
export interface TabActivity {
  chrome_tab_id: number;
  url: string;
  title: string;
  favicon_url: string | null;
  last_active_at: number;
  total_active_time_ms: number;
  visit_count: number;
  window_id: number;
}

export interface StaleTab {
  chrome_tab_id: number;
  url: string;
  title: string;
  favicon_url: string | null;
  inactive_hours: number;
}

// Storage keys
export type StorageKey =
  | 'tab_activity'
  | 'stale_tabs'
  | 'user_settings'
  | 'supabase_session'
  | 'sync_queue'
  | 'saved_tabs'
  | 'sessions'
  | 'folders';

// Message types for background/popup communication
export type MessageType =
  | 'GET_STALE_TABS'
  | 'SAVE_TABS'
  | 'CLOSE_TABS'
  | 'RESTORE_SESSION'
  | 'SYNC_NOW'
  | 'GET_TAB_ACTIVITY';

export interface Message<T = unknown> {
  type: MessageType;
  payload?: T;
}

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Default settings
export const DEFAULT_SETTINGS: UserSettings = {
  inactive_threshold_hours: 8,
  auto_archive_days: 30,
  notification_enabled: true,
  theme: 'system',
  sync_enabled: true,
};
