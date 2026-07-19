import { useEffect, useMemo, useState } from 'react';
import { Zap, MessageSquare } from 'lucide-react';
import { usePermissions } from './auth/usePermissions';
import InstallationForm from './installation/InstallationForm';
import ComplaintForm from './complaint/ComplaintForm';

const TABS = [
  {
    id: 'install',
    label: 'Installation',
    icon: Zap,
    component: InstallationForm,
    permission: 'canCreateInstallation'
  },
  {
    id: 'complaint',
    label: 'Complaint',
    icon: MessageSquare,
    component: ComplaintForm,
    permission: 'canCreateComplaint'
  }
];

function SubmissionPage() {
  const permissions = usePermissions();
  const availableTabs = useMemo(
    () => TABS.filter((tab) => permissions.isAdmin || permissions[tab.permission]),
    [permissions]
  );
  const [activeTab, setActiveTab] = useState(availableTabs[0]?.id || 'install');

  useEffect(() => {
    if (!availableTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(availableTabs[0]?.id || 'install');
    }
  }, [availableTabs, activeTab]);

  if (!availableTabs.length) {
    return (
      <div className="min-h-[420px] flex items-center justify-center p-6">
        <div className="text-center max-w-lg">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Access restricted</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You do not have permission to submit meter installations or complaints. Please contact your administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  const activeTabConfig = availableTabs.find((tab) => tab.id === activeTab) ?? availableTabs[0];
  const ActiveTabComponent = activeTabConfig.component;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
          <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Installations</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            Manage meter installations and complaints from one central page.
          </p>
        </div>
      </div>

      {availableTabs.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 sm:p-4">
          <div className="flex flex-wrap gap-2">
            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-900/70 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <ActiveTabComponent />
    </div>
  );
}

export default SubmissionPage;
