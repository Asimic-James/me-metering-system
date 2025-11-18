import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS, ROLES, hasPermission } from '../auth/permissions.jsx';
import JEDApiService from '../services/api';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Search,
  AlertCircle,
  Check,
  X,
  Shield
} from 'lucide-react';

// User Form Component
const UserForm = ({ user, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    role: user?.role || ROLES.INSTALLER,
    employeeId: user?.employeeId || '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!/^\d{11}$/.test(formData.phone)) {
      newErrors.phone = 'Phone must be 11 digits';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!user && !formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!user && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Name Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`mt-1 block w-full rounded-md shadow-sm ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        {/* Phone Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className={`mt-1 block w-full rounded-md shadow-sm ${
              errors.phone ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
        </div>

        {/* Email Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={`mt-1 block w-full rounded-md shadow-sm ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>

        {/* Role Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value={ROLES.INSTALLER}>Installer</option>
            <option value={ROLES.ADMIN}>Admin</option>
          </select>
        </div>

        {/* Employee ID Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Employee ID</label>
          <input
            type="text"
            value={formData.employeeId}
            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>

        {/* Password Fields - Only show for new users or password reset */}
        {!user && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          {user ? 'Update User' : 'Create User'}
        </button>
      </div>
    </form>
  );
};

function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  // Enhanced fetchUsers function in your UserManagement component
const fetchUsers = async () => {
  try {
    setLoading(true);
    setError(null);
    
    // Check if user management endpoints are available
    console.log('[UserManagement] Fetching users...');
    const response = await JEDApiService.getUsers();
    
    // Handle different response formats
    let usersData = [];
    
    if (response.success) {
      usersData = response.data || [];
    } else if (Array.isArray(response.data)) {
      usersData = response.data;
    } else if (Array.isArray(response)) {
      usersData = response;
    } else {
      usersData = response.data || [];
    }
    
    console.log('[UserManagement] Users received:', usersData.length, 'users');
    setUsers(usersData);
    
  } catch (err) {
    console.error('[UserManagement] Error fetching users:', err);
    
    // Enhanced error handling
    const errorMessage = err.message || '';
    
    if (errorMessage.includes('PERMISSION_ERROR')) {
      setError('You do not have permission to manage users.');
    } else if (errorMessage.includes('NOT_FOUND') || errorMessage.includes('404')) {
      setError('User management features are not available in this system.');
    } else {
      setError(err.message || 'Failed to load users. Please try again.');
    }
    
    // Set empty array as fallback
    setUsers([]);
  } finally {
    setLoading(false);
  }
};

  const handleCreateUser = async (userData) => {
    try {
      setError(null);
      await JEDApiService.createUser(userData);
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (userData) => {
    try {
      setError(null);
      await JEDApiService.updateUser(editingUser.id, userData);
      setShowForm(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      setError(null);
      await JEDApiService.deleteUser(userId);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user => {
  // Safe search with null checks
  const searchLower = searchQuery.toLowerCase();
  const userName = user?.name || '';
  const userEmail = user?.email || '';
  const userPhone = user?.phone || '';
  
  const matchesSearch = 
    userName.toLowerCase().includes(searchLower) ||
    userEmail.toLowerCase().includes(searchLower) ||
    userPhone.includes(searchQuery);
  
  const matchesRole = filterRole === 'all' || user?.role === filterRole;
  
  return matchesSearch && matchesRole;
});

  if (!hasPermission(currentUser?.role, PERMISSIONS.MANAGE_USERS)) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">
          You don't have permission to manage users.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage system users and their roles</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setShowForm(true);
          }}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingUser(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <UserForm
              user={editingUser}
              onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
              onCancel={() => {
                setShowForm(false);
                setEditingUser(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full rounded-md border-gray-300"
          />
        </div>
        <div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full rounded-md border-gray-300"
          >
            <option value="all">All Roles</option>
            <option value={ROLES.ADMIN}>Admin</option>
            <option value={ROLES.INSTALLER}>Installer</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
  {filteredUsers.map((user) => (
    <tr key={user.id}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-medium">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {user?.name || 'Unknown User'}
            </div>
            <div className="text-sm text-gray-500">{user?.email || 'No email'}</div>
            <div className="text-sm text-gray-500">{user?.phone || 'No phone'}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          user?.role === ROLES.ADMIN
            ? 'bg-purple-100 text-purple-800'
            : 'bg-blue-100 text-blue-800'
        }`}>
          <Shield className="w-3 h-3 mr-1" />
          {user?.role || 'Unknown'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {user?.employeeId || 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          user?.isActive
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {user?.isActive ? (
            <Check className="w-3 h-3 mr-1" />
          ) : (
            <X className="w-3 h-3 mr-1" />
          )}
          {user?.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          onClick={() => {
            setEditingUser(user);
            setShowForm(true);
          }}
          className="text-blue-600 hover:text-blue-900 mr-4"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleDeleteUser(user.id)}
          className="text-red-600 hover:text-red-900"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  ))}
</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;