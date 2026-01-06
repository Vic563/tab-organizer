import { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, FolderPlus, X } from 'lucide-react';
import type { TabGroup, SmartSession } from '@/shared/types';

interface TabGroupCardProps {
  group: TabGroup;
  onSaveToFolder?: (tabIds: number[]) => void;
  onCloseAll?: (tabIds: number[]) => void;
  onOpenTab?: (tabId: number) => void;
}

export function TabGroupCard({ group, onSaveToFolder, onCloseAll, onOpenTab }: TabGroupCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleSaveToFolder = () => {
    const tabIds = group.tabs.map(t => t.chrome_tab_id);
    onSaveToFolder?.(tabIds);
  };

  const handleCloseAll = () => {
    const tabIds = group.tabs.map(t => t.chrome_tab_id);
    onCloseAll?.(tabIds);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}

        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: group.color }}
        />

        <span className="text-sm font-medium text-gray-900 flex-1">{group.name}</span>

        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          {group.tab_count}
        </span>
      </div>

      {expanded && (
        <div className="border-t border-gray-100">
          <div className="flex gap-1 px-3 py-2 bg-gray-50 border-b border-gray-100">
            <button
              onClick={handleSaveToFolder}
              className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1"
            >
              <FolderPlus className="w-3 h-3" />
              Save All
            </button>
            <button
              onClick={handleCloseAll}
              className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Close All
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {group.tabs.map((tab) => (
              <div
                key={tab.chrome_tab_id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 group"
              >
                {tab.favicon_url ? (
                  <img src={tab.favicon_url} alt="" className="w-4 h-4 rounded flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 bg-gray-200 rounded flex-shrink-0" />
                )}
                <span className="text-sm text-gray-700 truncate flex-1">{tab.title}</span>
                <button
                  onClick={() => onOpenTab?.(tab.chrome_tab_id)}
                  className="p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SmartSessionCardProps {
  session: SmartSession;
  onSaveAsFolder?: (sessionId: string, folderName: string) => void;
}

export function SmartSessionCard({ session, onSaveAsFolder }: SmartSessionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const handleSaveAsFolder = () => {
    onSaveAsFolder?.(session.id, session.name);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}

        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900">{session.name}</span>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{formatTime(session.start_time)} - {formatTime(session.end_time)}</span>
            <span className="bg-gray-100 px-1.5 py-0.5 rounded">{session.tabs.length} tabs</span>
          </div>
        </div>

        {session.topic_tags.length > 0 && (
          <div className="flex gap-1">
            {session.topic_tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-100">
          <div className="flex gap-1 px-3 py-2 bg-gray-50 border-b border-gray-100">
            <button
              onClick={handleSaveAsFolder}
              className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1"
            >
              <FolderPlus className="w-3 h-3" />
              Save as Folder
            </button>
          </div>

          <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {session.tabs.map((tab) => (
              <div
                key={tab.chrome_tab_id}
                className="flex items-center gap-2 px-3 py-2"
              >
                {tab.favicon_url ? (
                  <img src={tab.favicon_url} alt="" className="w-4 h-4 rounded flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 bg-gray-200 rounded flex-shrink-0" />
                )}
                <span className="text-sm text-gray-700 truncate">{tab.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
