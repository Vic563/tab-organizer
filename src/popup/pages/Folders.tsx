import { useState, useEffect } from 'react';
import {
  FolderPlus,
  ChevronRight,
  Folder as FolderIcon,
  ExternalLink,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import { useFolderStore } from '@/shared/stores/folderStore';

export default function FoldersPage() {
  const {
    folders,
    savedTabs,
    loading,
    loadFolders,
    loadSavedTabs,
    createFolder,
    updateFolder,
    deleteFolder,
    deleteSavedTab,
    restoreTabs,
  } = useFolderStore();

  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');

  useEffect(() => {
    loadFolders();
    loadSavedTabs();
  }, [loadFolders, loadSavedTabs]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim());
    setNewFolderName('');
    setShowCreateModal(false);
  };

  const handleUpdateFolder = async (id: string) => {
    if (!editFolderName.trim()) return;
    await updateFolder(id, { name: editFolderName.trim() });
    setEditingFolder(null);
    setEditFolderName('');
  };

  const handleDeleteFolder = async (id: string) => {
    if (confirm('Delete this folder? Tabs will be moved to unfiled.')) {
      await deleteFolder(id);
      if (expandedFolder === id) {
        setExpandedFolder(null);
      }
    }
  };

  const handleOpenAllTabs = (folderId: string) => {
    const folderTabs = savedTabs.filter((t) => t.folder_id === folderId);
    const tabIds = folderTabs.map((t) => t.id);
    restoreTabs(tabIds);
  };

  const handleRestoreTab = (tabId: string) => {
    restoreTabs([tabId]);
  };

  const handleDeleteTab = async (tabId: string) => {
    await deleteSavedTab(tabId);
  };

  const getTabsInFolder = (folderId: string) => {
    return savedTabs.filter((t) => t.folder_id === folderId);
  };

  const unfiledTabs = savedTabs.filter((t) => !t.folder_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <h2 className="text-sm font-medium text-gray-900">Your Folders</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
        >
          <FolderPlus className="w-4 h-4" />
          New Folder
        </button>
      </div>

      {/* Create Folder Modal */}
      {showCreateModal && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setShowCreateModal(false);
              }}
            />
            <button
              onClick={handleCreateFolder}
              className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600"
            >
              Create
            </button>
            <button
              onClick={() => setShowCreateModal(false)}
              className="p-1.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Folders List */}
      {folders.length === 0 && unfiledTabs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <FolderIcon className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm">No folders yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Create a folder to organize your tabs
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-md hover:bg-blue-600"
          >
            <FolderPlus className="w-4 h-4" />
            Create Folder
          </button>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {/* Regular Folders */}
          {folders.map((folder) => {
            const tabCount = getTabsInFolder(folder.id).length;
            const isExpanded = expandedFolder === folder.id;
            const isEditing = editingFolder === folder.id;

            return (
              <div key={folder.id}>
                {/* Folder Header */}
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group">
                  <button
                    onClick={() =>
                      setExpandedFolder(isExpanded ? null : folder.id)
                    }
                    className="flex items-center gap-3 flex-1"
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
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFolderName}
                        onChange={(e) => setEditFolderName(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 px-1 py-0.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateFolder(folder.id);
                          if (e.key === 'Escape') setEditingFolder(null);
                        }}
                        onBlur={() => handleUpdateFolder(folder.id)}
                      />
                    ) : (
                      <span className="flex-1 text-left text-sm font-medium text-gray-900">
                        {folder.name}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{tabCount} tabs</span>
                  </button>

                  {/* Folder Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingFolder(folder.id);
                        setEditFolderName(folder.name);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded"
                      title="Rename folder"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Delete folder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

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
                            className="flex items-center gap-3 px-4 py-2 pl-12 group/tab hover:bg-gray-100"
                          >
                            {tab.favicon_url ? (
                              <img
                                src={tab.favicon_url}
                                alt=""
                                className="w-4 h-4 rounded flex-shrink-0"
                              />
                            ) : (
                              <div className="w-4 h-4 bg-gray-300 rounded flex-shrink-0" />
                            )}
                            <span className="flex-1 text-xs text-gray-600 truncate">
                              {tab.title}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover/tab:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleRestoreTab(tab.id)}
                                className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                title="Open tab"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteTab(tab.id)}
                                className="p-1 text-gray-400 hover:text-red-600 rounded"
                                title="Delete tab"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
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

          {/* Unfiled Tabs Section */}
          {unfiledTabs.length > 0 && (
            <div>
              <div
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() =>
                  setExpandedFolder(
                    expandedFolder === 'unfiled' ? null : 'unfiled'
                  )
                }
              >
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedFolder === 'unfiled' ? 'rotate-90' : ''
                  }`}
                />
                <FolderIcon className="w-5 h-5 text-gray-400" />
                <span className="flex-1 text-sm font-medium text-gray-500">
                  Unfiled
                </span>
                <span className="text-xs text-gray-400">
                  {unfiledTabs.length} tabs
                </span>
              </div>

              {expandedFolder === 'unfiled' && (
                <div className="bg-gray-50 border-t border-gray-100">
                  {unfiledTabs.map((tab) => (
                    <div
                      key={tab.id}
                      className="flex items-center gap-3 px-4 py-2 pl-12 group/tab hover:bg-gray-100"
                    >
                      {tab.favicon_url ? (
                        <img
                          src={tab.favicon_url}
                          alt=""
                          className="w-4 h-4 rounded flex-shrink-0"
                        />
                      ) : (
                        <div className="w-4 h-4 bg-gray-300 rounded flex-shrink-0" />
                      )}
                      <span className="flex-1 text-xs text-gray-600 truncate">
                        {tab.title}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover/tab:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleRestoreTab(tab.id)}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded"
                          title="Open tab"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteTab(tab.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Delete tab"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
