import { useState, useEffect } from 'react';
import {
  FolderPlus,
  ChevronRight,
  Folder as FolderIcon,
  ExternalLink,
} from 'lucide-react';
import { getStorage } from '@/shared/lib/chrome-storage';
import type { Folder } from '@/shared/types';
import type { SavedTabLocal } from '@/shared/lib/chrome-storage';

export default function FoldersPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [savedTabs, setSavedTabs] = useState<SavedTabLocal[]>([]);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [foldersData, tabsData] = await Promise.all([
        getStorage('folders'),
        getStorage('saved_tabs'),
      ]);
      setFolders(foldersData);
      setSavedTabs(tabsData);
    } catch (error) {
      console.error('Failed to load folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = () => {
    // TODO: Show create folder modal
    const name = prompt('Enter folder name:');
    if (!name) return;

    const newFolder: Folder = {
      id: crypto.randomUUID(),
      user_id: '', // Will be set when cloud sync is implemented
      parent_folder_id: null,
      name,
      icon: null,
      color: null,
      position: folders.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    chrome.storage.local.set({ folders: updatedFolders });
  };

  const handleOpenAllTabs = (folderId: string) => {
    const folderTabs = savedTabs.filter((t) => t.folder_id === folderId);
    folderTabs.forEach((tab) => {
      chrome.tabs.create({ url: tab.url, active: false });
    });
  };

  const getTabsInFolder = (folderId: string) => {
    return savedTabs.filter((t) => t.folder_id === folderId);
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
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-900">Your Folders</h2>
        <button
          onClick={handleCreateFolder}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
        >
          <FolderPlus className="w-4 h-4" />
          New Folder
        </button>
      </div>

      {/* Folders List */}
      {folders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <FolderIcon className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm">No folders yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Create a folder to organize your tabs
          </p>
          <button
            onClick={handleCreateFolder}
            className="mt-4 flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-md hover:bg-blue-600"
          >
            <FolderPlus className="w-4 h-4" />
            Create Folder
          </button>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {folders.map((folder) => {
            const tabCount = getTabsInFolder(folder.id).length;
            const isExpanded = expandedFolder === folder.id;

            return (
              <div key={folder.id}>
                {/* Folder Header */}
                <button
                  onClick={() =>
                    setExpandedFolder(isExpanded ? null : folder.id)
                  }
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                  <FolderIcon
                    className="w-5 h-5"
                    style={{ color: folder.color || '#6B7280' }}
                  />
                  <span className="flex-1 text-left text-sm font-medium text-gray-900">
                    {folder.name}
                  </span>
                  <span className="text-xs text-gray-400">{tabCount} tabs</span>
                </button>

                {/* Folder Contents */}
                {isExpanded && (
                  <div className="bg-gray-50 border-t border-gray-100">
                    {tabCount > 0 ? (
                      <>
                        <div className="flex justify-end px-4 py-2">
                          <button
                            onClick={() => handleOpenAllTabs(folder.id)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Open All
                          </button>
                        </div>
                        {getTabsInFolder(folder.id).map((tab) => (
                          <div
                            key={tab.id}
                            className="flex items-center gap-3 px-4 py-2 pl-12"
                          >
                            {tab.favicon_url ? (
                              <img
                                src={tab.favicon_url}
                                alt=""
                                className="w-4 h-4 rounded"
                              />
                            ) : (
                              <div className="w-4 h-4 bg-gray-300 rounded" />
                            )}
                            <span className="flex-1 text-xs text-gray-600 truncate">
                              {tab.title}
                            </span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="px-4 py-3 pl-12 text-xs text-gray-400">
                        No tabs in this folder
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
