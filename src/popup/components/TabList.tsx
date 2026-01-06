import { useState, useEffect, useRef } from 'react';
import { ExternalLink, Save, Trash2, FolderPlus, ChevronDown } from 'lucide-react';
import type { TabActivity, LocalFolder } from '@/shared/types';
import { useFolderStore } from '@/shared/stores/folderStore';
import { useTabStore } from '@/shared/stores/tabStore';

interface TabListProps {
  tabs: TabActivity[];
  onCloseTab: (tabId: number) => void;
  onOpenTab: (tabId: number) => void;
}

interface SaveDropdownProps {
  tabId: number;
  folders: LocalFolder[];
  onSave: (tabId: number, folderId?: string) => void;
  onClose: () => void;
}

function SaveDropdown({ tabId, folders, onSave, onClose }: SaveDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20"
    >
      <button
        onClick={() => {
          onSave(tabId);
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
      >
        <Save className="w-4 h-4 text-gray-400" />
        Save (unfiled)
      </button>
      {folders.length > 0 && (
        <>
          <div className="border-t border-gray-100 my-1" />
          <div className="px-3 py-1 text-xs text-gray-400 uppercase">Save to folder</div>
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => {
                onSave(tabId, folder.id);
                onClose();
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <FolderPlus className="w-4 h-4" style={{ color: folder.color || '#6B7280' }} />
              {folder.name}
            </button>
          ))}
        </>
      )}
    </div>
  );
}

export default function TabList({
  tabs,
  onCloseTab,
  onOpenTab,
}: TabListProps) {
  const { folders, loadFolders } = useFolderStore();
  const { saveTab } = useTabStore();
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const handleSave = async (tabId: number, folderId?: string) => {
    await saveTab(tabId, folderId);
  };

  if (tabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <p className="text-sm">No open tabs to display</p>
      </div>
    );
  }

  const formatTime = (timestamp: number) => {
    const diff = now - timestamp;
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
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative">
            <button
              onClick={() => onOpenTab(tab.chrome_tab_id)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Open tab"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            {/* Save with dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === tab.chrome_tab_id ? null : tab.chrome_tab_id)}
                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded flex items-center"
                title="Save tab"
              >
                <Save className="w-4 h-4" />
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>

              {openDropdown === tab.chrome_tab_id && (
                <SaveDropdown
                  tabId={tab.chrome_tab_id}
                  folders={folders}
                  onSave={handleSave}
                  onClose={() => setOpenDropdown(null)}
                />
              )}
            </div>

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
