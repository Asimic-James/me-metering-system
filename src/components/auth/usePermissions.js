import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission as hasPermissionUtil, hasPermissions as hasPermissionsUtil, hasRole as hasRoleUtil } from './permissions';

// Hook that provides permission helpers bound to the current user
export function usePermissions() {
  const { user } = useAuth();
  const userRole = user?.role || null;

  const api = useMemo(() => ({
    hasPermission: (permission) => hasPermissionUtil(userRole, permission),
    hasPermissions: (permissions) => hasPermissionsUtil(userRole, permissions),
    hasRole: (role) => hasRoleUtil(userRole, role),
    role: userRole,
  }), [userRole]);

  return api;
}

// Convenience hooks
export const useHasPermission = (permission) => {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
};

export const useHasPermissions = (permissions) => {
  const { hasPermissions } = usePermissions();
  return hasPermissions(permissions);
};

export const useHasRole = (role) => {
  const { hasRole } = usePermissions();
  return hasRole(role);
};

export default usePermissions;
