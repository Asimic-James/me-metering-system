// src/components/admin/UserManagement.jsx
// Refactored and optimized to align with latest app updates
import { useState, useEffect, useCallback } from 'react';
import ConfirmationModal from '../common/ConfirmationModal';
import { usePermissions } from '../auth/usePermissions';
import { ROLES, getRoleMetadata } from '../auth/permissions';
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
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

const roleBadgeClass = (role) => {
  if (role === ROLES.SUPERADMIN) return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
  if (role === ROLES.ADMIN) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
  return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
};

// User Form Component
// `canAssignPrivilegedRoles` gates whether ADMIN/SUPERADMIN are even
// selectable — per the real API's documented rule that only a SUPERADMIN
// may create/edit an Admin (or Super Admin) account. An ADMIN using this
// form can still manage INSTALLER accounts freely.
const UserForm = ({ user, onSubmit, onCancel, loading, canAssignPrivilegedRoles }) => {
  const isEditingPrivilegedUser = !!user && (user.role === ROLES.ADMIN || user.role === ROLES.SUPERADMIN);
  const formLocked = isEditingPrivilegedUser && !canAssignPrivilegedRoles;

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    // Password is required by the real UserCreate schema (minLength 6) —
    // only collected/validated when creating, since UserUpdate has no
    // password field at all (password changes go through a separate flow).
    if (!user) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      if (formData.confirmPassword !== formData.password) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
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
      {formLocked && (
        <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Access Restricted: only a Super Administrator can modify an Admin or Super Admin account.
          </p>
        </div>
      )}
      <fieldset disabled={formLocked} className="contents">
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
            className={`form-input w-full px-3 py-2 ${
              errors.firstName ? 'border-red-400 dark:border-red-500 focus:ring-red-500' : ''
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
            className={`form-input w-full px-3 py-2 ${
              errors.lastName ? 'border-red-400 dark:border-red-500 focus:ring-red-500' : ''
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
            className={`form-input w-full px-3 py-2 ${
              errors.phone ? 'border-red-400 dark:border-red-500 focus:ring-red-500' : ''
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
            className={`form-input w-full px-3 py-2 ${
              errors.email ? 'border-red-400 dark:border-red-500 focus:ring-red-500' : ''
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
            disabled={!canAssignPrivilegedRoles && formData.role !== ROLES.INSTALLER && !user}
            className="form-input w-full px-3 py-2 disabled:opacity-50"
          >
            <option value={ROLES.INSTALLER}>Installer</option>
            {canAssignPrivilegedRoles && <option value={ROLES.ADMIN}>Admin</option>}
            {canAssignPrivilegedRoles && <option value={ROLES.SUPERADMIN}>Super Admin</option>}
          </select>
          {!canAssignPrivilegedRoles && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Only a Super Administrator can assign Admin or Super Admin roles.
            </p>
          )}
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
            className={`form-input w-full px-3 py-2 ${
              errors.nin ? 'border-red-400 dark:border-red-500 focus:ring-red-500' : ''
            }`}
            placeholder="11-digit NIN"
            maxLength={11}
          />
          {errors.nin && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.nin}</p>
          )}
        </div>

        {/* Password fields — required by the real UserCreate schema
            (minLength 6), only collected when creating a new user. There
            is no password field on UserUpdate, so editing never touches it. */}
        {!user && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`form-input w-full px-3 py-2 pr-10 ${
                    errors.password ? 'border-red-400 dark:border-red-500 focus:ring-red-500' : ''
                  }`}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`form-input w-full px-3 py-2 pr-10 ${
                    errors.confirmPassword ? 'border-red-400 dark:border-red-500 focus:ring-red-500' : ''
                  }`}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
              )}
            </div>
          </>
        )}
      </div>
      </fieldset>

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
          disabled={loading || formLocked}
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
  const permissions = usePermissions();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToResetPassword, setUserToResetPassword] = useState(null);
  const [resetPasswordMessage, setResetPasswordMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');


  // Admin's user-management scope is Installers only (per the real API's
  // documented "Create an Admin user (SUPERADMIN only)" rule, extended
  // consistently here to viewing too — an Admin has no business reason to
  // see other Admin/SuperAdmin accounts). Requesting `role: INSTALLER`
  // server-side means an Admin's browser never even receives the other
  // records, not just that the UI hides them.
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[UserManagement] Fetching users...');
      const response = await jedApi.getUsers(
        permissions.isSuperAdmin ? {} : { role: ROLES.INSTALLER }
      );

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
  }, [permissions.isSuperAdmin]);

  const handleCreateUser = useCallback(async (userData) => {
    const role = userData.role.toUpperCase();
    // Client-side guard as a UX nicety (clear message instead of a raw
    // 403) — the backend remains the real authorization boundary here.
    if ((role === ROLES.ADMIN || role === ROLES.SUPERADMIN) && !permissions.isSuperAdmin) {
      setError('Access Restricted: only a Super Administrator can create an Admin or Super Admin account.');
      return;
    }

    try {
      setActionLoading('create');
      setError(null);

      // Real UserCreate schema: firstName, lastName, phone, email,
      // password, nin, role (optional homeAddress/officeAddress omitted —
      // not collected by this form). confirmPassword is a client-only
      // field and is deliberately not sent.
      const payload = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        email: userData.email,
        password: userData.password,
        nin: userData.nin,
        role,
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
  }, [fetchUsers, permissions.isSuperAdmin]);

  const handleUpdateUser = useCallback(async (userData) => {
    const role = userData.role.toUpperCase();
    if ((role === ROLES.ADMIN || role === ROLES.SUPERADMIN) && !permissions.isSuperAdmin) {
      setError('Access Restricted: only a Super Administrator can assign an Admin or Super Admin role.');
      return;
    }

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
        role,
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
  }, [editingUser, fetchUsers, permissions.isSuperAdmin]);

  const handleDeleteUser = useCallback(async () => {
    if (!userToDelete) return;
    if (!permissions.isSuperAdmin) {
      setError('Access Restricted: only a Super Administrator can delete user accounts.');
      setUserToDelete(null);
      return;
    }

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
  }, [userToDelete, fetchUsers, permissions.isSuperAdmin]);

  const handleResetPassword = useCallback(async () => {
    if (!userToResetPassword) return;
    if (!permissions.isSuperAdmin) {
      setError('Access Restricted: only a Super Administrator can reset a user\'s password.');
      setUserToResetPassword(null);
      return;
    }

    try {
      setActionLoading(`reset-${userToResetPassword.id}`);
      setError(null);
      setResetPasswordMessage(null);

      console.log('[UserManagement] Resetting password for user:', userToResetPassword.id);
      await jedApi.resetPassword(userToResetPassword.id);

      setResetPasswordMessage(
        `Password for ${userToResetPassword.firstName || ''} ${userToResetPassword.lastName || ''}`.trim() +
        ' has been reset to the system default.'
      );
      setUserToResetPassword(null); // Close modal on success
    } catch (err) {
      console.error('[UserManagement] Error resetting password:', err);
      setError(err.message || 'Failed to reset password');
      // Keep the modal open on error so the user sees the message
    } finally {
      setActionLoading(null);
    }
  }, [userToResetPassword, permissions.isSuperAdmin]);

  // Fetch users on mount
  useEffect(() => {
    if (permissions.isAdmin) {
      fetchUsers();
    }
  }, [permissions.isAdmin, fetchUsers]);

  // Filter users based on search and role. The `role: INSTALLER` request
  // param already keeps non-SuperAdmins from receiving other accounts, but
  // this client-side filter is defense-in-depth in case that param is ever
  // dropped or the backend response includes more than requested.
  const filteredUsers = users.filter(user => {
    if (!permissions.isSuperAdmin && user?.role !== ROLES.INSTALLER) return false;

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
              {permissions.isSuperAdmin
                ? 'Manage Admin and Installer accounts'
                : 'Add and manage Installer accounts'}
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

      {/* Reset Password Success Alert */}
      {resetPasswordMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex gap-3">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-green-700 dark:text-green-300">{resetPasswordMessage}</p>
            </div>
            <button
              onClick={() => setResetPasswordMessage(null)}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
          <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                canAssignPrivilegedRoles={permissions.isSuperAdmin}
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

      {/* Reset Password Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!userToResetPassword}
        onClose={() => setUserToResetPassword(null)}
        onConfirm={handleResetPassword}
        loading={actionLoading === `reset-${userToResetPassword?.id}`}
        title="Reset Password"
        message={`Reset the password for "${userToResetPassword?.firstName} ${userToResetPassword?.lastName}" to the system default? They will need to change it after logging in.`}
        confirmText="Reset Password"
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
            className="form-input w-full pl-10 pr-4 py-2"
          />
        </div>
        <div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="form-input w-full px-3 py-2"
          >
            <option value="all">All Roles</option>
            {permissions.isSuperAdmin && <option value={ROLES.SUPERADMIN}>Super Admin</option>}
            {permissions.isSuperAdmin && <option value={ROLES.ADMIN}>Admin</option>}
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
        <div className="card p-12 text-center">
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
        <div className="card overflow-hidden">
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
                        <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
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
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${roleBadgeClass(user?.role)}`}>
                        <Shield className="w-3 h-3" />
                        {getRoleMetadata(user?.role).displayName || user?.role || 'Unknown'}
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
                      {(() => {
                        const isPrivilegedTarget = user?.role === ROLES.ADMIN || user?.role === ROLES.SUPERADMIN;
                        const canEditThisUser = permissions.isSuperAdmin || !isPrivilegedTarget;
                        // Delete and password-reset are Super Admin-only,
                        // for every account including Installers — Admin's
                        // scope is add/view/edit Installers, not destructive
                        // or security-sensitive actions.
                        const canDestructivelyManage = permissions.isSuperAdmin;
                        const editRestrictedTitle = 'Access Restricted: only a Super Administrator can manage Admin/Super Admin accounts';
                        const superAdminOnlyTitle = 'Access Restricted: only a Super Administrator can do this';
                        return (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setShowForm(true);
                              }}
                              disabled={!canEditThisUser || actionLoading === `delete-${user.id}`}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
                              title={canEditThisUser ? 'Edit user' : editRestrictedTitle}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setUserToResetPassword(user)}
                              disabled={!canDestructivelyManage || actionLoading === `delete-${user.id}` || actionLoading === `reset-${user.id}`}
                              className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors disabled:opacity-50"
                              title={canDestructivelyManage ? 'Reset password to default' : superAdminOnlyTitle}
                            >
                              {actionLoading === `reset-${user.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Lock className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => setUserToDelete(user)}
                              disabled={!canDestructivelyManage || actionLoading === `delete-${user.id}`}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                              title={canDestructivelyManage ? 'Delete user' : superAdminOnlyTitle}
                            >
                              {actionLoading === `delete-${user.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats Footer — "Admins" count only shown to Super Admin, since an
          Admin's view is scoped to Installer accounts only and doesn't
          have the full picture to make that count meaningful. */}
      {!loading && users.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-800 dark:text-blue-200">
              Total {permissions.isSuperAdmin ? 'Users' : 'Installers'}: <strong>{users.length}</strong>
            </span>
            <span className="text-blue-800 dark:text-blue-200">
              Showing: <strong>{filteredUsers.length}</strong>
            </span>
            {permissions.isSuperAdmin && (
              <span className="text-blue-800 dark:text-blue-200">
                Admins: <strong>{users.filter(u => u.role === ROLES.ADMIN || u.role === ROLES.SUPERADMIN).length}</strong>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;