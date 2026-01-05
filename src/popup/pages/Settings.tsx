import { useState, useEffect } from 'react';
import {
  Clock,
  Archive,
  Bell,
  Moon,
  Cloud,
  LogIn,
  LogOut,
  User,
} from 'lucide-react';
import type { UserSettings } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const result = await chrome.storage.local.get([
        'user_settings',
        'supabase_session',
      ]);
      const user_settings = result.user_settings as UserSettings | undefined;
      const supabase_session = result.supabase_session as { access_token: string; refresh_token: string } | undefined;

      if (user_settings) {
        setSettings(user_settings);
      }
      if (supabase_session?.access_token) {
        setIsLoggedIn(true);
        // TODO: Decode JWT to get email
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await chrome.storage.local.set({ user_settings: updated });
  };

  const handleSignIn = () => {
    // TODO: Implement Supabase OAuth sign in
    alert('Sign in with Google coming soon!');
  };

  const handleSignOut = async () => {
    await chrome.storage.local.remove('supabase_session');
    setIsLoggedIn(false);
    setUserEmail(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Account Section */}
      <div className="px-4 py-4 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Account
        </h3>

        {isLoggedIn ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {userEmail || 'Signed in'}
                </p>
                <p className="text-xs text-gray-500">Sync enabled</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-2 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Sign in to sync
          </button>
        )}
      </div>

      {/* Preferences Section */}
      <div className="px-4 py-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Preferences
        </h3>

        <div className="space-y-4">
          {/* Inactive Threshold */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-900">Inactive threshold</p>
                <p className="text-xs text-gray-500">
                  Mark tabs as stale after
                </p>
              </div>
            </div>
            <select
              value={settings.inactive_threshold_hours}
              onChange={(e) =>
                updateSetting('inactive_threshold_hours', parseInt(e.target.value))
              }
              className="text-sm bg-gray-100 border-0 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500"
            >
              <option value={4}>4 hours</option>
              <option value={8}>8 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>2 days</option>
            </select>
          </div>

          {/* Auto Archive */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Archive className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-900">Auto-archive</p>
                <p className="text-xs text-gray-500">
                  Archive saved tabs after
                </p>
              </div>
            </div>
            <select
              value={settings.auto_archive_days}
              onChange={(e) =>
                updateSetting('auto_archive_days', parseInt(e.target.value))
              }
              className="text-sm bg-gray-100 border-0 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-900">Notifications</p>
                <p className="text-xs text-gray-500">
                  Alert for inactive tabs
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notification_enabled}
                onChange={(e) =>
                  updateSetting('notification_enabled', e.target.checked)
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Theme */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-900">Theme</p>
                <p className="text-xs text-gray-500">Appearance mode</p>
              </div>
            </div>
            <select
              value={settings.theme}
              onChange={(e) =>
                updateSetting('theme', e.target.value as UserSettings['theme'])
              }
              className="text-sm bg-gray-100 border-0 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          {/* Sync */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cloud className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-900">Cloud sync</p>
                <p className="text-xs text-gray-500">
                  Sync across devices
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sync_enabled}
                onChange={(e) =>
                  updateSetting('sync_enabled', e.target.checked)
                }
                disabled={!isLoggedIn}
                className="sr-only peer"
              />
              <div className={`w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 ${!isLoggedIn ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
            </label>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="px-4 py-4 border-t border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          About
        </h3>
        <p className="text-xs text-gray-500">Tab Organizer v1.0.0</p>
      </div>
    </div>
  );
}
