import { useState, useEffect } from 'react';
import { Archive as ArchiveIcon, ExternalLink, Trash2, Clock } from 'lucide-react';

interface ArchivedTabLocal {
  id: string;
  url: string;
  title: string;
  favicon_url: string | null;
  archived_at: string;
  session_name?: string;
}

export default function ArchivePage() {
  const [archivedTabs, setArchivedTabs] = useState<ArchivedTabLocal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArchivedTabs();
  }, []);

  const loadArchivedTabs = async () => {
    setLoading(true);
    try {
      // For now, just show saved tabs as "archived"
      const result = await chrome.storage.local.get('saved_tabs');
      const saved_tabs = (result.saved_tabs || []) as ArchivedTabLocal[];
      setArchivedTabs(
        saved_tabs.map((tab) => ({
          ...tab,
          archived_at: tab.archived_at || new Date().toISOString(),
        }))
      );
    } catch (error) {
      console.error('Failed to load archived tabs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreTab = (tab: ArchivedTabLocal) => {
    chrome.tabs.create({ url: tab.url, active: false });
  };

  const handleDeleteTab = async (tabId: string) => {
    const updated = archivedTabs.filter((t) => t.id !== tabId);
    setArchivedTabs(updated);
    await chrome.storage.local.set({ saved_tabs: updated });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Group tabs by date
  const groupedTabs = archivedTabs.reduce(
    (groups, tab) => {
      const date = formatDate(tab.archived_at);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(tab);
      return groups;
    },
    {} as Record<string, ArchivedTabLocal[]>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (archivedTabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <ArchiveIcon className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-sm">No archived tabs</p>
        <p className="text-xs text-gray-400 mt-1">
          Saved tabs will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-900">Archived Tabs</h2>
        <span className="text-xs text-gray-400">{archivedTabs.length} tabs</span>
      </div>

      {/* Grouped Tabs */}
      <div className="divide-y divide-gray-100">
        {Object.entries(groupedTabs).map(([date, tabs]) => (
          <div key={date}>
            {/* Date Header */}
            <div className="px-4 py-2 bg-gray-50 flex items-center gap-2">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">{date}</span>
            </div>

            {/* Tabs */}
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
              >
                {/* Favicon */}
                {tab.favicon_url ? (
                  <img
                    src={tab.favicon_url}
                    alt=""
                    className="w-5 h-5 rounded flex-shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 bg-gray-200 rounded flex-shrink-0" />
                )}

                {/* Tab info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{tab.title}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {new URL(tab.url).hostname}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleRestoreTab(tab)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Restore tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTab(tab.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete permanently"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
