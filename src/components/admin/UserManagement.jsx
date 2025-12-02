// src/components/admin/UserManagement.jsx
// Refactored and optimized to align with latest app updates
import { useState, useEffect, useCallback } from 'react';
import ConfirmationModal from '../common/ConfirmationModal';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../auth/usePermissions';
import jedApi from '../services/api';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Search,
  AlertCircle,
  Check,
  X,
  Shield,
  Loader2,
  Lock
} from 'lucide-react';

// Constants
const ROLES = {
  ADMIN: 'admin',
  INSTALLER: 'installer'
};

// User Form Component
const UserForm = ({ user, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || (user?.name ? user.name.split(' ')[0] : ''),
    lastName: user?.lastName || (user?.name ? user.name.split(' ').slice(1).join(' ') : ''),
    phone: user?.phone || '',
    email: user?.email || '',
    role: user?.role || ROLES.INSTALLER,
    nin: user?.nin || '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First Name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last Name is required';
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
    
    if (!formData.nin.trim()) {
      newErrors.nin = 'NIN is required';
    } else if (!/^\d{11}$/.test(formData.nin)) {
      newErrors.nin = 'NIN must be 11 digits';
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
        {/* First Name Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            First Name *
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
              errors.firstName 
                ? 'border-red-300 dark:border-red-600' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="John"
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.firstName}</p>
          )}
        </div>

        {/* Last Name Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
              errors.lastName 
                ? 'border-red-300 dark:border-red-600' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Doe"
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.lastName}</p>
          )}
        </div>

        {/* Phone Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
              errors.phone 
                ? 'border-red-300 dark:border-red-600' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="08012345678"
            maxLength={11}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
              errors.email 
                ? 'border-red-300 dark:border-red-600' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="john@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
          )}
        </div>

        {/* Role Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Role *
          </label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value={ROLES.INSTALLER}>Installer</option>
            <option value={ROLES.ADMIN}>Admin</option>
          </select>
        </div>

        {/* NIN Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            NIN *
          </label>
          <input
            type="text"
            value={formData.nin}
            onChange={(e) => setFormData({ ...formData, nin: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
              errors.nin 
                ? 'border-red-300 dark:border-red-600' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="11-digit NIN"
            maxLength={11}
          />
          {errors.nin && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.nin}</p>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {user ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {user ? 'Update User' : 'Create User'}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

// Main Component
function UserManagement() {
  const { user: currentUser } = useAuth();
  const permissions = usePermissions();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Fetch users on mount
  useEffect(() => {
    if (permissions.isAdmin) {
      fetchUsers();
    }
  }, [permissions.isAdmin]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[UserManagement] Fetching users...');
      const response = await jedApi.getUsers();
      
      // Handle different response formats
      const usersData = 
        response?.data?.users || 
        response?.data || 
        response?.users || 
        (Array.isArray(response) ? response : []);
      
      console.log('[UserManagement] Users loaded:', usersData.length);
      setUsers(usersData);
      
    } catch (err) {
      console.error('[UserManagement] Error fetching users:', err);
      
      const errorMessage = err.message || '';
      
      if (errorMessage.includes('PERMISSION_ERROR') || errorMessage.includes('403')) {
        setError('You do not have permission to manage users.');
      } else if (errorMessage.includes('NOT_FOUND') || errorMessage.includes('404')) {
        setError('User management endpoint not found. Please contact support.');
      } else if (errorMessage.includes('NETWORK_ERROR')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to load users. Please try again.');
      }
      
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreateUser = useCallback(async (userData) => {
    try {
      setActionLoading('create');
      setError(null);
      
      const payload = {
        ...userData,
        role: userData.role.toUpperCase(),
      };
      console.log('[UserManagement] Creating user:', payload.email);
      await jedApi.createUser(payload);
      
      setShowForm(false);
      await fetchUsers();
    } catch (err) {
      console.error('[UserManagement] Error creating user:', err);
      setError(err.message || 'Failed to create user');
    } finally {
      setActionLoading(null);
    }
  }, [fetchUsers]);

  const handleUpdateUser = useCallback(async (userData) => {
    try {
      setActionLoading(`update-${editingUser.id}`);
      setError(null);
      
      // Construct the payload to match the API's expected format
      const payload = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        name: `${userData.firstName} ${userData.lastName}`.trim(),
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        nin: userData.nin,
      };

      console.log('[UserManagement] Updating user:', editingUser.id, 'with payload:', payload);
      await jedApi.updateUser(editingUser.id, payload);
      
      setShowForm(false);
      setEditingUser(null);
      await fetchUsers();
    } catch (err) {
      console.error('[UserManagement] Error updating user:', err);
      setError(err.message || 'Failed to update user');
    } finally {
      setActionLoading(null);
    }
  }, [editingUser, fetchUsers]);

  const handleDeleteUser = useCallback(async () => {
    if (!userToDelete) return;
    
    try {
      setActionLoading(`delete-${userToDelete.id}`);
      setError(null);
      
      console.log('[UserManagement] Deleting user:', userToDelete.id);
      await jedApi.deleteUser(userToDelete.id);
      
      await fetchUsers();
      setUserToDelete(null); // Close modal on success
    } catch (err) {
      console.error('[UserManagement] Error deleting user:', err);
      setError(err.message || 'Failed to delete user');
      // Keep the modal open on error so the user sees the message
    } finally {
      setActionLoading(null);
    }
  }, [userToDelete, fetchUsers]);

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const userName = `${user?.firstName || ''} ${user?.lastName || ''}`;
    const userEmail = user?.email || '';
    const userPhone = user?.phone || '';
    
    const matchesSearch = 
      userName.toLowerCase().includes(searchLower) ||
      userEmail.toLowerCase().includes(searchLower) ||
      userPhone.includes(searchQuery);
    
    const matchesRole = filterRole === 'all' || user?.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              User Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage system users and their roles
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {error}
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingUser ? 'Edit User' : 'Create New User'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <UserForm
                user={editingUser}
                onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
                onCancel={() => {
                  setShowForm(false);
                  setEditingUser(null);
                }}
                loading={!!actionLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteUser}
        loading={actionLoading === `delete-${userToDelete?.id}`}
        title="Delete User"
        message={`Are you sure you want to delete the user "${userToDelete?.firstName} ${userToDelete?.lastName}"? This action cannot be undone.`}
      />

      {/* Filters and Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value={ROLES.ADMIN}>Admin</option>
            <option value={ROLES.INSTALLER}>Installer</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery || filterRole !== 'all' ? 'No users found' : 'No users yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || filterRole !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Get started by creating your first user'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-semibold text-sm">
                            {((user?.firstName || 'U')[0] + (user?.lastName || ''))[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user?.email || 'No email'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {user?.phone || 'No phone'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user?.role === ROLES.ADMIN
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                      }`}>
                        <Shield className="w-3 h-3" />
                        {user?.role || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user?.isActive !== false
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}>
                        {user?.isActive !== false ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        {user?.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setShowForm(true);
                          }}
                          disabled={actionLoading === `delete-${user.id}`}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
                          title="Edit user"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setUserToDelete(user)}
                          disabled={actionLoading === `delete-${user.id}`}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete user"
                        >
                          {actionLoading === `delete-${user.id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats Footer */}
      {!loading && users.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-800 dark:text-blue-200">
              Total Users: <strong>{users.length}</strong>
            </span>
            <span className="text-blue-800 dark:text-blue-200">
              Showing: <strong>{filteredUsers.length}</strong>
            </span>
            <span className="text-blue-800 dark:text-blue-200">
              Admins: <strong>{users.filter(u => u.role === ROLES.ADMIN).length}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;