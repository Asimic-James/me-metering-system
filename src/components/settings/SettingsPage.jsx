// src/components/settings/SettingsPage.jsx
// Tabbed container for the Settings route — Meter Types and API Keys are
// distinct resources with no shared logic, so each stays its own
// component; this just switches between them. Tab pattern matches the
// one already established in MeterSchedule.jsx (Inventory/Query tabs)
// for consistency rather than inventing a new UI convention.
import { useState } from 'react';
import { Settings as SettingsIcon, Zap, KeyRound } from 'lucide-react';
import MeterTypeSettings from './MeterTypeSettings';
import ApiKeySettings from './ApiKeySettings';

const TABS = [
  { id: 'meterTypes', label: 'Meter Types', icon: Zap },
  { id: 'apiKeys', label: 'API Keys', icon: KeyRound },
];

function SettingsPage() {
  const [activeTab, setActiveTab] = useState('meterTypes');

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
          <SettingsIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            Manage meter types, pricing, and API access
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4">
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-sm ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'meterTypes' && <MeterTypeSettings />}
      {activeTab === 'apiKeys' && <ApiKeySettings />}
    </div>
  );
}

export default SettingsPage;