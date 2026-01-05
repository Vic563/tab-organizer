import { useState, useEffect } from 'react';
import { Home, Folder, Archive, Settings } from 'lucide-react';
import HomePage from './popup/pages/Home';
import FoldersPage from './popup/pages/Folders';
import ArchivePage from './popup/pages/Archive';
import SettingsPage from './popup/pages/Settings';
import SearchResults from './popup/pages/SearchResults';
import SearchBar from './popup/components/SearchBar';
import type { UserSettings } from './shared/types';

type Page = 'home' | 'folders' | 'archive' | 'settings';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Apply theme on mount and when settings change
  useEffect(() => {
    const applyTheme = (theme: 'light' | 'dark' | 'system') => {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        // System preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    // Load and apply theme
    chrome.storage.local.get('user_settings').then((result) => {
      const settings = result.user_settings as UserSettings | undefined;
      applyTheme(settings?.theme || 'system');
    });

    // Listen for storage changes (when settings are updated)
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.user_settings?.newValue) {
        const newSettings = changes.user_settings.newValue as UserSettings;
        applyTheme(newSettings.theme || 'system');
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      chrome.storage.local.get('user_settings').then((result) => {
        const settings = result.user_settings as UserSettings | undefined;
        if (settings?.theme === 'system') {
          applyTheme('system');
        }
      });
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  const renderPage = () => {
    if (isSearching && searchQuery) {
      // Show search results for both active and saved tabs
      return <SearchResults query={searchQuery} />;
    }

    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'folders':
        return <FoldersPage />;
      case 'archive':
        return <ArchivePage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  const navItems = [
    { id: 'home' as const, icon: Home, label: 'Home' },
    { id: 'folders' as const, icon: Folder, label: 'Folders' },
    { id: 'archive' as const, icon: Archive, label: 'Archive' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex flex-col h-[600px] bg-gray-50">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">T</span>
            </div>
            Tab Organizer
          </h1>
        </div>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onFocus={() => setIsSearching(true)}
          onBlur={() => {
            if (!searchQuery) setIsSearching(false);
          }}
          onClear={() => {
            setSearchQuery('');
            setIsSearching(false);
          }}
        />
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {renderPage()}
      </main>

      {/* Bottom Navigation */}
      <nav className="flex-shrink-0 bg-white border-t border-gray-200">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id && !isSearching;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  setIsSearching(false);
                  setSearchQuery('');
                }}
                className={`flex flex-col items-center py-2 px-4 transition-colors ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default App;
