import { User } from 'lucide-react';

const UserInfoPanel = ({ user }) => {
  if (!user) return null;

  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-6 border">
      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
        <User className="w-4 h-4 mr-2" />
        Installer Information
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <span className="text-gray-600">Name:</span>
          <span className="ml-2 font-medium text-gray-900">{user.name || 'N/A'}</span>
        </div>
        <div>
          <span className="text-gray-600">Employee ID:</span>
          <span className="ml-2 font-medium text-gray-900">{user.employeeId || 'N/A'}</span>
        </div>
        <div>
          <span className="text-gray-600">Phone:</span>
          <span className="ml-2 font-medium text-gray-900">{user.phone || 'N/A'}</span>
        </div>
        <div>
          <span className="text-gray-600">Role:</span>
          <span className="ml-2 font-medium text-gray-900 capitalize">{user.role || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
};

export default UserInfoPanel;