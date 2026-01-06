import { useEffect, useState } from 'react';
import { Archive as ArchiveIcon, ExternalLink, Trash2, Clock, Filter, CheckSquare, Square } from 'lucide-react';
import { useFolderStore } from '@/shared/stores/folderStore';
import { useSessionStore } from '@/shared/stores/sessionStore';

type DateFilter = 'all' | 'today' | 'week' | 'month';

export default function ArchivePage() {
  const {
    savedTabs,
    folders,
    loading,
    loadSavedTabs,
    loadFolders,
    deleteSavedTab,
    restoreTabs,
  } = useFolderStore();

  const { bulkDeleteSavedTabs, bulkRestoreTabs } = useSessionStore();

  const [selectedTabs, setSelectedTabs] = useState<Set<string>>(new Set());
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadSavedTabs();
    loadFolders();
  }, [loadSavedTabs, loadFolders]);

  const handleRestoreTab = (tabId: string) => {
    restoreTabs([tabId]);
  };

  const handleDeleteTab = (tabId: string) => {
    deleteSavedTab(tabId);
  };

  const toggleSelectTab = (tabId: string) => {
    const newSelected = new Set(selectedTabs);
    if (newSelected.has(tabId)) {
      newSelected.delete(tabId);
    } else {
      newSelected.add(tabId);
    }
    setSelectedTabs(newSelected);
  };

  const selectAll = () => {
    setSelectedTabs(new Set(filteredTabs.map(t => t.id)));
  };

  const clearSelection = () => {
    setSelectedTabs(new Set());
  };

  const handleBulkDelete = async () => {
    await bulkDeleteSavedTabs(Array.from(selectedTabs));
    setSelectedTabs(new Set());
    await loadSavedTabs();
  };

  const handleBulkRestore = async () => {
    await bulkRestoreTabs(Array.from(selectedTabs));
    setSelectedTabs(new Set());
  };

  const getFilteredTabs = () => {
    let filtered = savedTabs;

    if (folderFilter !== null) {
      filtered = filtered.filter(t => t.folder_id === folderFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      if (dateFilter === 'today') {
        cutoff.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'week') {
        cutoff.setDate(now.getDate() - 7);
      } else if (dateFilter === 'month') {
        cutoff.setMonth(now.getMonth() - 1);
      }
      filtered = filtered.filter(t => new Date(t.created_at) >= cutoff);
    }

    return filtered;
  };
  
  const filteredTabs = getFilteredTabs();

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
  const groupedTabs = filteredTabs.reduce(
    (groups, tab) => {
      const date = formatDate(tab.created_at);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(tab);
      return groups;
    },
    {} as Record<string, typeof savedTabs>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (savedTabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <ArchiveIcon className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-sm">No saved tabs</p>
        <p className="text-xs text-gray-400 mt-1">
          Saved tabs will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <h2 className="text-sm font-medium text-gray-900">Saved Tabs</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{filteredTabs.length} tabs</span>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded ${showFilters ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-14">Folder:</span>
            <select
              value={folderFilter ?? ''}
              onChange={(e) => setFolderFilter(e.target.value === '' ? null : e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1 flex-1"
            >
              <option value="">All folders</option>
              <option value="">Unfiled</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-14">Date:</span>
            <div className="flex gap-1">
              {(['all', 'today', 'week', 'month'] as DateFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setDateFilter(filter)}
                  className={`text-xs px-2 py-1 rounded ${
                    dateFilter === filter
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter === 'today' ? 'Today' : filter === 'week' ? 'Week' : 'Month'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedTabs.size > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-700">{selectedTabs.size} selected</span>
            <button onClick={clearSelection} className="text-xs text-blue-600 hover:underline">
              Clear
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBulkRestore}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Open All
            </button>
            <button
              onClick={handleBulkDelete}
              className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete All
            </button>
          </div>
        </div>
      )}

      {/* Select All */}
      {filteredTabs.length > 0 && selectedTabs.size === 0 && (
        <div className="px-4 py-2 border-b border-gray-100">
          <button
            onClick={selectAll}
            className="text-xs text-blue-600 hover:underline"
          >
            Select all ({filteredTabs.length})
          </button>
        </div>
      )}

      {/* Grouped Tabs */}
      <div className="divide-y divide-gray-100">
        {Object.entries(groupedTabs).map(([date, tabs]) => (
          <div key={date}>
            {/* Date Header */}
            <div className="px-4 py-2 bg-gray-50 flex items-center gap-2 sticky top-[49px]">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">{date}</span>
              <span className="text-xs text-gray-400">({tabs.length})</span>
            </div>

            {/* Tabs */}
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelectTab(tab.id)}
                  className="text-gray-400 hover:text-blue-600"
                >
                  {selectedTabs.has(tab.id) ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>

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
                    onClick={() => handleRestoreTab(tab.id)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Open tab"
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
