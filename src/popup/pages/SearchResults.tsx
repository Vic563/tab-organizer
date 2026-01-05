import { useEffect } from 'react';
import { ExternalLink, Trash2, Save, Search } from 'lucide-react';
import { useTabStore } from '@/shared/stores/tabStore';
import { useFolderStore } from '@/shared/stores/folderStore';

interface SearchResultsProps {
  query: string;
}

export default function SearchResults({ query }: SearchResultsProps) {
  const { activeTabs, loadActiveTabs, closeTab } = useTabStore();
  const { savedTabs, loadSavedTabs, deleteSavedTab, restoreTabs } = useFolderStore();

  useEffect(() => {
    loadActiveTabs();
    loadSavedTabs();
  }, [loadActiveTabs, loadSavedTabs]);

  const lowerQuery = query.toLowerCase();

  // Filter active tabs
  const filteredActiveTabs = activeTabs.filter(
    (tab) =>
      tab.title.toLowerCase().includes(lowerQuery) ||
      tab.url.toLowerCase().includes(lowerQuery)
  );

  // Filter saved tabs
  const filteredSavedTabs = savedTabs.filter(
    (tab) =>
      tab.title.toLowerCase().includes(lowerQuery) ||
      tab.url.toLowerCase().includes(lowerQuery)
  );

  const totalResults = filteredActiveTabs.length + filteredSavedTabs.length;

  const handleOpenActiveTab = (tabId: number) => {
    chrome.tabs.update(tabId, { active: true });
  };

  const handleCloseActiveTab = async (tabId: number) => {
    await closeTab(tabId);
  };

  const handleRestoreSavedTab = (tabId: string) => {
    restoreTabs([tabId]);
  };

  const handleDeleteSavedTab = (tabId: string) => {
    deleteSavedTab(tabId);
  };

  if (totalResults === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
        <Search className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-sm">No results for "{query}"</p>
        <p className="text-xs text-gray-400 mt-1">
          Try searching for a different term
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <h2 className="text-sm font-medium text-gray-900">Search Results</h2>
        <span className="text-xs text-gray-400">{totalResults} found</span>
      </div>

      {/* Active Tabs Results */}
      {filteredActiveTabs.length > 0 && (
        <div>
          <div className="px-4 py-2 bg-blue-50 flex items-center gap-2">
            <span className="text-xs font-medium text-blue-600">Open Tabs</span>
            <span className="text-xs text-blue-400">({filteredActiveTabs.length})</span>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredActiveTabs.map((tab) => (
              <div
                key={tab.chrome_tab_id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
              >
                {tab.favicon_url ? (
                  <img
                    src={tab.favicon_url}
                    alt=""
                    className="w-5 h-5 rounded flex-shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 bg-gray-200 rounded flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {tab.title || 'Untitled'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {new URL(tab.url).hostname}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenActiveTab(tab.chrome_tab_id)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Switch to tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCloseActiveTab(tab.chrome_tab_id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Close tab"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved Tabs Results */}
      {filteredSavedTabs.length > 0 && (
        <div>
          <div className="px-4 py-2 bg-green-50 flex items-center gap-2">
            <Save className="w-3 h-3 text-green-600" />
            <span className="text-xs font-medium text-green-600">Saved Tabs</span>
            <span className="text-xs text-green-400">({filteredSavedTabs.length})</span>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredSavedTabs.map((tab) => (
              <div
                key={tab.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
              >
                {tab.favicon_url ? (
                  <img
                    src={tab.favicon_url}
                    alt=""
                    className="w-5 h-5 rounded flex-shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 bg-gray-200 rounded flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {tab.title || 'Untitled'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {new URL(tab.url).hostname}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleRestoreSavedTab(tab.id)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Open tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSavedTab(tab.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
