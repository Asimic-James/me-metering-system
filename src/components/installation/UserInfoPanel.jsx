import { User } from 'lucide-react';

const UserInfoPanel = ({ user }) => {
  if (!user) return null;

  return (
    <div className="bg-blue-50 dark:bg-gray-800 rounded-lg p-4 mb-6 border border-blue-200 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
        <User className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
        Installer Information
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <span className="text-gray-600 dark:text-gray-400">Name:</span>
          <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{user.name || 'N/A'}</span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Phone:</span>
          <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{user.phone || 'N/A'}</span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Role:</span>
          <span className="ml-2 font-medium text-gray-900 dark:text-gray-100 capitalize">{user.role || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
};

export default UserInfoPanel;