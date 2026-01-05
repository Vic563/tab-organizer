import { ExternalLink, Save, Trash2 } from 'lucide-react';
import type { TabActivity } from '@/shared/types';

interface TabListProps {
  tabs: TabActivity[];
  onSaveTab: (tabId: number) => void;
  onCloseTab: (tabId: number) => void;
  onOpenTab: (tabId: number) => void;
}

export default function TabList({
  tabs,
  onSaveTab,
  onCloseTab,
  onOpenTab,
}: TabListProps) {
  if (tabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <p className="text-sm">No open tabs to display</p>
      </div>
    );
  }

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="divide-y divide-gray-100">
      {tabs.map((tab) => (
        <div
          key={tab.chrome_tab_id}
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
            <p className="text-sm font-medium text-gray-900 truncate">
              {tab.title || 'Untitled'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {new URL(tab.url).hostname}
            </p>
          </div>

          {/* Time */}
          <span className="text-xs text-gray-400 flex-shrink-0">
            {formatTime(tab.last_active_at)}
          </span>

          {/* Actions (visible on hover) */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onOpenTab(tab.chrome_tab_id)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Open tab"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSaveTab(tab.chrome_tab_id)}
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
              title="Save tab"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={() => onCloseTab(tab.chrome_tab_id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="Close tab"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
