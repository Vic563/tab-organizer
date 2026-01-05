import { AlertTriangle, Save, X, Clock } from 'lucide-react';
import type { StaleTab } from '@/shared/types';

interface StaleTabAlertProps {
  staleTabs: StaleTab[];
  onSaveAndClose: (tabIds: number[]) => void;
  onDismiss: () => void;
  onRemindLater: () => void;
}

export default function StaleTabAlert({
  staleTabs,
  onSaveAndClose,
  onDismiss,
  onRemindLater,
}: StaleTabAlertProps) {
  if (staleTabs.length === 0) return null;

  const tabIds = staleTabs.map((t) => t.chrome_tab_id);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mx-4 mt-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-amber-800">
            {staleTabs.length} tab{staleTabs.length > 1 ? 's' : ''} unused for 8+ hours
          </h3>
          <p className="text-xs text-amber-700 mt-1">
            Save and close for better focus?
          </p>

          {/* Tab preview */}
          <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
            {staleTabs.slice(0, 5).map((tab) => (
              <div
                key={tab.chrome_tab_id}
                className="flex items-center gap-2 text-xs text-gray-600"
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
                <span className="truncate flex-1">{tab.title}</span>
                <span className="text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {tab.inactive_hours}h
                </span>
              </div>
            ))}
            {staleTabs.length > 5 && (
              <p className="text-xs text-gray-500">
                +{staleTabs.length - 5} more tabs
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onSaveAndClose(tabIds)}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-md hover:bg-amber-700 transition-colors"
            >
              <Save className="w-3 h-3" />
              Save & Close
            </button>
            <button
              onClick={onRemindLater}
              className="px-3 py-1.5 text-amber-700 text-xs font-medium hover:bg-amber-100 rounded-md transition-colors"
            >
              Remind later
            </button>
            <button
              onClick={onDismiss}
              className="ml-auto p-1 text-amber-600 hover:text-amber-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
