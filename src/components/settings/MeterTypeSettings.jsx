// src/components/settings/MeterTypeSettings.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Settings, Plus, Edit2, Trash2, Check, X, 
  AlertCircle, Loader2, Search, DollarSign 
} from 'lucide-react';
import jedApi from '../services/api';

const MeterTypeSettings = () => {
  const [meterTypes, setMeterTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    amount: '' 
  });
  const [actionLoading, setActionLoading] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false,
    limit: 10
  });

  // Fetch meter types
  const fetchMeterTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await jedApi.getMeterTypes({
        page: pagination.currentPage,
        limit: pagination.limit,
        query: searchTerm
      });
      
      // Handle paginated response structure
      const data = response?.success ? response.data : (response?.data || response || []);
      const paginationData = response?.pagination || {
        ...pagination,
        totalCount: data.length,
        totalPages: 1
      };
      setMeterTypes(Array.isArray(data) ? data : []);
      
      console.log('[Settings] Loaded meter types:', data);
    } catch (err) {
      console.error('[Settings] Failed to fetch meter types:', err);
      setError(err.message || 'Failed to load meter types');
      setMeterTypes([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.limit, searchTerm]);

  useEffect(() => {
    fetchMeterTypes();
  }, [fetchMeterTypes, pagination.currentPage]);

  // Validate form data
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Meter type name is required');
      return false;
    }

    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      setError('Amount must be greater than zero');
      return false;
    }

    return true;
  };

  // Create meter type
  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      setActionLoading('create');
      setError(null);
      
      const payload = {
        name: formData.name.trim(),
        amount: parseFloat(formData.amount)
      };

      console.log('[Settings] Creating meter type:', payload);
      await jedApi.createMeterType(payload);
      
      await fetchMeterTypes();
      setFormData({ name: '', description: '', amount: '' });
      setIsCreating(false);
    } catch (err) {
      console.error('[Settings] Failed to create meter type:', err);
      
      // Parse backend validation errors
      const errorMsg = err.message || 'Failed to create meter type';
      if (errorMsg.includes('Validation failed')) {
        setError(errorMsg.replace('Validation failed: ', ''));
      } else {
        setError(errorMsg);
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Update meter type
  const handleUpdate = async (id) => {
    if (!validateForm()) return;

    try {
      setActionLoading(`update-${id}`);
      setError(null);
      
      const payload = {
        name: formData.name.trim(),
        amount: parseFloat(formData.amount),
        description: formData.description.trim() || undefined
      };

      console.log('[Settings] Updating meter type:', id, payload);
      await jedApi.updateMeterType(id, payload);
      
      await fetchMeterTypes();
      setEditingId(null);
      setFormData({ name: '', description: '', amount: '' });
    } catch (err) {
      console.error('[Settings] Failed to update meter type:', err);
      
      const errorMsg = err.message || 'Failed to update meter type';
      if (errorMsg.includes('Validation failed')) {
        setError(errorMsg.replace('Validation failed: ', ''));
      } else {
        setError(errorMsg);
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Delete meter type
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to deactivate "${name}"?`)) {
      return;
    }

    try {
      setActionLoading(`delete-${id}`);
      setError(null);
      
      console.log('[Settings] Deleting meter type:', id);
      await jedApi.deleteMeterType(id);
      await fetchMeterTypes();
    } catch (err) {
      console.error('[Settings] Failed to delete meter type:', err);
      setError(err.message || 'Failed to deactivate meter type');
    } finally {
      setActionLoading(null);
    }
  };

  // Start editing
  const startEdit = (meterType) => {
    setEditingId(meterType.id);
    setFormData({ 
      name: meterType.name, 
      description: meterType.description || '',
      amount: meterType.amount?.toString() || ''
    });
    setIsCreating(false);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ name: '', description: '', amount: '' });
    setError(null);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Filter meter types
  const filteredMeterTypes = useMemo(() => meterTypes, [meterTypes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">Loading meter types...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Settings
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage meter types and configurations
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setIsCreating(true);
            setEditingId(null);
            setFormData({ name: '', description: '', amount: '' });
            setError(null);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Meter Type
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

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search meter types..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Create New Meter Type
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Single Phase, Three Phase"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (₦) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base font-semibold">
                    ₦
                  </span>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="50000"
                    min="1"
                    step="1"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelEdit}
                disabled={actionLoading === 'create'}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={actionLoading === 'create'}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'create' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Create
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meter Types List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Meter Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Description
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
              {filteredMeterTypes.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No meter types found matching your search' : 'No meter types configured yet'}
                  </td>
                </tr>
              ) : (
                filteredMeterTypes.map((type) => (
                  <tr key={type.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    {editingId === type.id ? (
                      <>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            min="1"
                            step="1"
                            className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            type.isActive 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {type.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleUpdate(type.id)}
                              disabled={actionLoading === `update-${type.id}`}
                              className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                              title="Save"
                            >
                              {actionLoading === `update-${type.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={actionLoading === `update-${type.id}`}
                              className="p-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {type.name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {formatCurrency(type.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {type.description || '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            type.isActive 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {type.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => startEdit(type)}
                              disabled={!!actionLoading}
                              className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(type.id, type.name)}
                              disabled={actionLoading === `delete-${type.id}`}
                              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                              title="Deactivate"
                            >
                              {actionLoading === `delete-${type.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Page <strong>{pagination.currentPage}</strong> of <strong>{pagination.totalPages}</strong> 
              {' '}(<strong>{pagination.totalCount}</strong> total types)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(p => ({ ...p, currentPage: p.currentPage - 1 }))}
                disabled={!pagination.hasPrev || loading}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Page {pagination.currentPage}
              </span>
              <button
                onClick={() => setPagination(p => ({ ...p, currentPage: p.currentPage + 1 }))}
                disabled={!pagination.hasNext || loading}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-blue-700 dark:text-blue-300">Total Types:</span>
            <span className="ml-2 font-bold text-blue-900 dark:text-blue-100">{meterTypes.length}</span>
          </div>
          <div>
            <span className="text-blue-700 dark:text-blue-300">Active:</span>
            <span className="ml-2 font-bold text-green-600 dark:text-green-400">
              {meterTypes.filter(t => t.isActive).length}
            </span>
          </div>
          <div>
            <span className="text-blue-700 dark:text-blue-300">Inactive:</span>
            <span className="ml-2 font-bold text-gray-600 dark:text-gray-400">
              {meterTypes.filter(t => !t.isActive).length}
            </span>
          </div>
          <div>
            <span className="text-blue-700 dark:text-blue-300">Showing:</span>
            <span className="ml-2 font-bold text-blue-900 dark:text-blue-100">
              {filteredMeterTypes.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeterTypeSettings;