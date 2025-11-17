import { useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  hasPermission as hasPermissionUtil, 
  hasPermissions as hasPermissionsUtil, 
  hasAnyPermission as hasAnyPermissionUtil,
  hasRole as hasRoleUtil,
  canAccessFeature as canAccessFeatureUtil,
  getAllPermissionsForRole,
  getRoleDisplayName,
  getRoleDescription
} from './permissions';

// Main permissions hook that provides comprehensive permission helpers
export function usePermissions() {
  const { user } = useAuth();
  const userRole = user?.role || null;

  // Memoized permission checking functions
  const hasPermission = useCallback((permission) => 
    hasPermissionUtil(userRole, permission), 
    [userRole]
  );

  const hasPermissions = useCallback((permissions) => 
    hasPermissionsUtil(userRole, permissions), 
    [userRole]
  );

  const hasAnyPermission = useCallback((permissions) => 
    hasAnyPermissionUtil(userRole, permissions), 
    [userRole]
  );

  const hasRole = useCallback((role) => 
    hasRoleUtil(userRole, role), 
    [userRole]
  );

  const canAccessFeature = useCallback((feature) => 
    canAccessFeatureUtil(userRole, feature), 
    [userRole]
  );

  // Memoized user-specific data
  const userPermissions = useMemo(() => 
    getAllPermissionsForRole(userRole), 
    [userRole]
  );

  const roleDisplayName = useMemo(() => 
    getRoleDisplayName(userRole), 
    [userRole]
  );

  const roleDescription = useMemo(() => 
    getRoleDescription(userRole), 
    [userRole]
  );

  const api = useMemo(() => ({
    // Permission checking
    hasPermission,
    hasPermissions,
    hasAnyPermission,
    hasRole,
    canAccessFeature,
    
    // User role information
    role: userRole,
    roleDisplayName,
    roleDescription,
    
    // User permissions
    permissions: userPermissions,
    
    // User context
    user,
    
    // Utility functions
    canManageUsers: hasPermissionUtil(userRole, 'manage:users'),
    canViewAdminDashboard: hasPermissionUtil(userRole, 'view:admin_dashboard'),
    canCreateInstallations: hasPermissionUtil(userRole, 'create:installation'),
    canViewAllInstallations: hasPermissionUtil(userRole, 'view:all_installations'),
    
    // Feature flags
    features: {
      userManagement: canAccessFeatureUtil(userRole, 'user_management'),
      adminDashboard: canAccessFeatureUtil(userRole, 'admin_dashboard'),
      installationSubmission: canAccessFeatureUtil(userRole, 'installation_submission'),
      scheduleManagement: canAccessFeatureUtil(userRole, 'schedule_management'),
      reports: canAccessFeatureUtil(userRole, 'reports'),
      performanceAnalytics: canAccessFeatureUtil(userRole, 'performance_analytics')
    }
  }), [
    userRole,
    user,
    hasPermission,
    hasPermissions,
    hasAnyPermission,
    hasRole,
    canAccessFeature,
    roleDisplayName,
    roleDescription,
    userPermissions
  ]);

  return api;
}

// Convenience hook for single permission check
export const useHasPermission = (permission) => {
  const { hasPermission } = usePermissions();
  return useMemo(() => hasPermission(permission), [hasPermission, permission]);
};

// Convenience hook for multiple permissions (all required)
export const useHasPermissions = (permissions) => {
  const { hasPermissions } = usePermissions();
  return useMemo(() => hasPermissions(permissions), [hasPermissions, permissions]);
};

// Convenience hook for any permission (at least one required)
export const useHasAnyPermission = (permissions) => {
  const { hasAnyPermission } = usePermissions();
  return useMemo(() => hasAnyPermission(permissions), [hasAnyPermission, permissions]);
};

// Convenience hook for role check
export const useHasRole = (role) => {
  const { hasRole } = usePermissions();
  return useMemo(() => hasRole(role), [hasRole, role]);
};

// Convenience hook for feature access
export const useCanAccessFeature = (feature) => {
  const { canAccessFeature } = usePermissions();
  return useMemo(() => canAccessFeature(feature), [canAccessFeature, feature]);
};

// Convenience hook for user management permissions
export const useCanManageUsers = () => {
  const { canManageUsers } = usePermissions();
  return canManageUsers;
};

// Convenience hook for admin dashboard access
export const useCanViewAdminDashboard = () => {
  const { canViewAdminDashboard } = usePermissions();
  return canViewAdminDashboard;
};

// Convenience hook for installation creation
export const useCanCreateInstallations = () => {
  const { canCreateInstallations } = usePermissions();
  return canCreateInstallations;
};

// Convenience hook for viewing all installations
export const useCanViewAllInstallations = () => {
  const { canViewAllInstallations } = usePermissions();
  return canViewAllInstallations;
};

// Hook for getting user's role information
export const useRoleInfo = () => {
  const { role, roleDisplayName, roleDescription } = usePermissions();
  return useMemo(() => ({
    role,
    roleDisplayName,
    roleDescription
  }), [role, roleDisplayName, roleDescription]);
};

// Hook for getting user's permissions list
export const useUserPermissions = () => {
  const { permissions } = usePermissions();
  return permissions;
};

// Hook for checking if user has any of the common administrative permissions
export const useIsAdminUser = () => {
  const { hasAnyPermission } = usePermissions();
  return useMemo(() => 
    hasAnyPermission(['manage:users', 'view:admin_dashboard', 'manage:settings']),
    [hasAnyPermission]
  );
};

// Hook for checking if user can perform installation-related actions
export const useIsInstallerUser = () => {
  const { hasAnyPermission } = usePermissions();
  return useMemo(() => 
    hasAnyPermission(['create:installation', 'view:installer_dashboard']),
    [hasAnyPermission]
  );
};

// Hook for feature-based access control
export const useFeatureFlags = () => {
  const { features } = usePermissions();
  return features;
};

// Higher-order component for permission-based rendering
export const withPermission = (WrappedComponent, requiredPermission) => {
  return function PermissionWrapper(props) {
    const hasPermission = useHasPermission(requiredPermission);
    
    if (!hasPermission) {
      return null; // Or return a fallback component
    }
    
    return <WrappedComponent {...props} />;
  };
};

// Higher-order component for role-based rendering
export const withRole = (WrappedComponent, requiredRole) => {
  return function RoleWrapper(props) {
    const hasRole = useHasRole(requiredRole);
    
    if (!hasRole) {
      return null; // Or return a fallback component
    }
    
    return <WrappedComponent {...props} />;
  };
};

// Component for conditional rendering based on permissions
export const PermissionGuard = ({ 
  children, 
  permission, 
  permissions, 
  anyPermission, 
  role, 
  fallback = null 
}) => {
  const hasPerm = useHasPermission(permission);
  const hasPerms = useHasPermissions(permissions);
  const hasAnyPerm = useHasAnyPermission(anyPermission);
  const hasRequiredRole = useHasRole(role);

  const hasAccess = 
    (permission && hasPerm) ||
    (permissions && hasPerms) ||
    (anyPermission && hasAnyPerm) ||
    (role && hasRequiredRole);

  return hasAccess ? children : fallback;
};

// Component for feature-based conditional rendering
export const FeatureGuard = ({ 
  children, 
  feature, 
  fallback = null 
}) => {
  const canAccess = useCanAccessFeature(feature);
  return canAccess ? children : fallback;
};

export default usePermissions;