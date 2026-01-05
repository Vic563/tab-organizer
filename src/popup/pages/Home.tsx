import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import TabList from '../components/TabList';
import StaleTabAlert from '../components/StaleTabAlert';
import { useTabStore } from '@/shared/stores/tabStore';

export default function HomePage() {
  const {
    activeTabs,
    staleTabs,
    loading,
    loadActiveTabs,
    loadStaleTabs,
    closeTab,
    saveAndCloseTabs,
  } = useTabStore();

  const [showStaleAlert, setShowStaleAlert] = useState(true);

  useEffect(() => {
    loadActiveTabs();
    loadStaleTabs();
  }, [loadActiveTabs, loadStaleTabs]);

  const handleSaveAndClose = async (tabIds: number[]) => {
    await saveAndCloseTabs(tabIds);
    setShowStaleAlert(false);
  };

  const handleCloseTab = async (tabId: number) => {
    await closeTab(tabId);
  };

  const handleOpenTab = (tabId: number) => {
    chrome.tabs.update(tabId, { active: true });
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
      {/* Stale Tab Alert */}
      {showStaleAlert && staleTabs.length > 0 && (
        <StaleTabAlert
          staleTabs={staleTabs}
          onSaveAndClose={handleSaveAndClose}
          onDismiss={() => setShowStaleAlert(false)}
          onRemindLater={() => setShowStaleAlert(false)}
        />
      )}

      {/* Active Tabs Section */}
      <div className="mt-4">
        <div className="flex items-center justify-between px-4 mb-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
