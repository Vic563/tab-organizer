import { useEffect, useState } from 'react';
import { RefreshCw, Sparkles, Layers, AlertTriangle } from 'lucide-react';
import TabList from '../components/TabList';
import StaleTabAlert from '../components/StaleTabAlert';
import { TabGroupCard, SmartSessionCard } from '../components/TabGroupCard';
import { useTabStore } from '@/shared/stores/tabStore';
import { useSessionStore } from '@/shared/stores/sessionStore';
import { useFolderStore } from '@/shared/stores/folderStore';

export default function HomePage() {
  const {
    activeTabs,
    staleTabs,
    loading,
    closeError,
    loadActiveTabs,
    loadStaleTabs,
    closeTab,
    closeTabs,
    openTab,
    saveTabs,
    saveAndCloseTabs,
    clearCloseError,
  } = useTabStore();

  const {
    tabGroups,
    smartSessions,
    loadTabGroups,
    loadSmartSessions,
    saveSessionAsFolder,
  } = useSessionStore();

  const { loadFolders } = useFolderStore();

  const [showStaleAlert, setShowStaleAlert] = useState(true);
  const [showSmartGroups, setShowSmartGroups] = useState(true);

  useEffect(() => {
    loadActiveTabs();
    loadStaleTabs();
    loadTabGroups();
    loadSmartSessions();
    loadFolders();
  }, [loadActiveTabs, loadStaleTabs, loadTabGroups, loadSmartSessions, loadFolders]);

  const handleSaveAndClose = async (tabIds: number[]) => {
    await saveAndCloseTabs(tabIds);
    setShowStaleAlert(false);
  };

  const handleCloseTab = async (tabId: number) => {
    await closeTab(tabId);
  };

  const handleOpenTab = (tabId: number) => {
    const tab = activeTabs.find((item) => item.chrome_tab_id === tabId);
    const tabUrl = tab?.url;
    openTab(tabId, tabUrl);
  };

  const handleSaveGroupToFolder = async (tabIds: number[]) => {
    await saveTabs(tabIds);
    await loadActiveTabs();
  };

  const handleCloseGroupTabs = async (tabIds: number[]) => {
    await closeTabs(tabIds);
  };

  const handleSaveSessionAsFolder = async (sessionId: string, folderName: string) => {
    await saveSessionAsFolder(sessionId, folderName);
    await loadFolders();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full">
      {closeError && (
        <div className="mx-4 mt-3 mb-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{closeError} (some sites may block programmatic close).</span>
          </div>
          <button
            onClick={clearCloseError}
            className="text-amber-700 hover:text-amber-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stale Tab Alert */}
      {showStaleAlert && staleTabs.length > 0 && (
        <StaleTabAlert
          staleTabs={staleTabs}
          onSaveAndClose={handleSaveAndClose}
          onDismiss={() => setShowStaleAlert(false)}
          onRemindLater={() => setShowStaleAlert(false)}
        />
      )}

      {/* Smart Groups Section */}
      {showSmartGroups && (tabGroups.length > 0 || smartSessions.length > 0) && (
        <div className="mt-4">
          <div className="flex items-center justify-between px-4 mb-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Smart Groups
            </h2>
            <button
              onClick={() => setShowSmartGroups(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Hide
            </button>
          </div>

          <div className="px-4 space-y-2">
            {/* Tab Groups (by domain) */}
            {tabGroups.slice(0, 3).map((group) => (
              <TabGroupCard
                key={group.id}
                group={group}
                onSaveToFolder={handleSaveGroupToFolder}
                onCloseAll={handleCloseGroupTabs}
                onOpenTab={handleOpenTab}
              />
            ))}

            {/* Smart Sessions */}
            {smartSessions.slice(0, 2).map((session) => (
              <SmartSessionCard
                key={session.id}
                session={session}
                onSaveAsFolder={handleSaveSessionAsFolder}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Tabs Section */}
      <div className="mt-4">
        <div className="flex items-center justify-between px-4 mb-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3" />
            Open Tabs
          </h2>
          <span className="text-xs text-gray-400">{activeTabs.length}</span>
        </div>

        <TabList
          tabs={activeTabs}
          onCloseTab={handleCloseTab}
          onOpenTab={handleOpenTab}
        />
      </div>
    </div>
  );
}
