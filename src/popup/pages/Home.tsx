import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import TabList from '../components/TabList';
import StaleTabAlert from '../components/StaleTabAlert';
import type { TabActivity, StaleTab } from '@/shared/types';

interface HomePageProps {
  searchQuery?: string;
}

export default function HomePage({ searchQuery }: HomePageProps) {
  const [tabs, setTabs] = useState<TabActivity[]>([]);
  const [staleTabs, setStaleTabs] = useState<StaleTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStaleAlert, setShowStaleAlert] = useState(true);

  useEffect(() => {
    loadTabs();
  }, []);

  const loadTabs = async () => {
    setLoading(true);
    try {
      // Get tab activity from background
      const response = await chrome.runtime.sendMessage({
        type: 'GET_TAB_ACTIVITY',
      });

      if (response.success) {
        const activityMap = response.data as Record<string, TabActivity>;
        const tabList = Object.values(activityMap).sort(
          (a, b) => b.last_active_at - a.last_active_at
        );
        setTabs(tabList);
      }

      // Get stale tabs
      const staleResponse = await chrome.runtime.sendMessage({
        type: 'GET_STALE_TABS',
      });

      if (staleResponse.success) {
        setStaleTabs(staleResponse.data as StaleTab[]);
      }
    } catch (error) {
      console.error('Failed to load tabs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndClose = async (tabIds: number[]) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'SAVE_TABS',
        payload: tabIds,
      });
      await chrome.runtime.sendMessage({
        type: 'CLOSE_TABS',
        payload: tabIds,
      });
      setShowStaleAlert(false);
      loadTabs();
    } catch (error) {
      console.error('Failed to save and close tabs:', error);
    }
  };

  const handleSaveTab = async (tabId: number) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'SAVE_TABS',
        payload: [tabId],
      });
      // Show success feedback
    } catch (error) {
      console.error('Failed to save tab:', error);
    }
  };

  const handleCloseTab = async (tabId: number) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'CLOSE_TABS',
        payload: [tabId],
      });
      loadTabs();
    } catch (error) {
      console.error('Failed to close tab:', error);
    }
  };

  const handleOpenTab = (tabId: number) => {
    chrome.tabs.update(tabId, { active: true });
  };

  // Filter tabs by search query
  const filteredTabs = searchQuery
    ? tabs.filter(
        (tab) =>
          tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tab.url.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tabs;

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
            {searchQuery ? 'Search Results' : 'Open Tabs'}
          </h2>
          <span className="text-xs text-gray-400">{filteredTabs.length}</span>
        </div>

        <TabList
          tabs={filteredTabs}
          onSaveTab={handleSaveTab}
          onCloseTab={handleCloseTab}
          onOpenTab={handleOpenTab}
        />
      </div>
    </div>
  );
}
