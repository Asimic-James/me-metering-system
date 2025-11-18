// usePermission.js - Enhanced hook with better error handling and performance
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
  getRoleDescription,
  getRoleMetadata,
  getAssignableRoles,
  canAssignRole,
  PERMISSIONS,
  ROLES
} from './permissions';

// Main permissions hook that provides comprehensive permission helpers
export function usePermissions() {
  const { user } = useAuth();
  const userRole = user?.role || null;

  // Memoized permission checking functions with better error handling
  const hasPermission = useCallback((permission) => {
    if (!permission) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('usePermissions: hasPermission called without permission');
      }
      return false;
    }
    return hasPermissionUtil(userRole, permission);
  }, [userRole]);

  const hasPermissions = useCallback((permissions) => {
    if (!permissions || !Array.isArray(permissions)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('usePermissions: hasPermissions called with invalid permissions', permissions);
      }
      return false;
    }
    return hasPermissionsUtil(userRole, permissions);
  }, [userRole]);

  const hasAnyPermission = useCallback((permissions) => {
    if (!permissions || !Array.isArray(permissions)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('usePermissions: hasAnyPermission called with invalid permissions', permissions);
      }
      return false;
    }
    return hasAnyPermissionUtil(userRole, permissions);
  }, [userRole]);

  const hasRole = useCallback((role) => {
    if (!role) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('usePermissions: hasRole called without role');
      }
      return false;
    }
    return hasRoleUtil(userRole, role);
  }, [userRole]);

  const canAccessFeature = useCallback((feature) => {
    if (!feature) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('usePermissions: canAccessFeature called without feature');
      }
      return false;
    }
    return canAccessFeatureUtil(userRole, feature);
  }, [userRole]);

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

  const roleMetadata = useMemo(() => 
    getRoleMetadata(userRole), 
    [userRole]
  );

  const assignableRoles = useMemo(() => 
    getAssignableRoles(userRole), 
    [userRole]
  );

  const api = useMemo(() => ({
    // Core permission checking
    hasPermission,
    hasPermissions,
    hasAnyPermission,
    hasRole,
    canAccessFeature,
    
    // User role information
    role: userRole,
    roleDisplayName,
    roleDescription,
    roleMetadata,
    
    // User permissions
    permissions: userPermissions,
    
    // Role management
    assignableRoles,
    canAssignRole: (targetRole) => canAssignRole(userRole, targetRole),
    
    // User context
    user,
    isAuthenticated: !!user,
    
    // Utility functions with specific permissions (pre-computed for performance)
    canManageUsers: hasPermissionUtil(userRole, PERMISSIONS.USERS.MANAGE),
    canViewAdminDashboard: hasPermissionUtil(userRole, PERMISSIONS.DASHBOARD.VIEW_ADMIN),
    canViewInstallerDashboard: hasPermissionUtil(userRole, PERMISSIONS.DASHBOARD.VIEW_INSTALLER),
    canCreateInstallations: hasPermissionUtil(userRole, PERMISSIONS.INSTALLATIONS.CREATE),
    canViewAllInstallations: hasPermissionUtil(userRole, PERMISSIONS.INSTALLATIONS.VIEW_ALL),
    canManageInstallations: hasPermissionUtil(userRole, PERMISSIONS.INSTALLATIONS.MANAGE),
    canCompleteInstallations: hasPermissionUtil(userRole, PERMISSIONS.INSTALLATIONS.COMPLETE),
    canViewReports: hasPermissionUtil(userRole, PERMISSIONS.REPORTS.VIEW),
    canExportData: hasPermissionUtil(userRole, PERMISSIONS.REPORTS.EXPORT),
    canManageSettings: hasPermissionUtil(userRole, PERMISSIONS.SYSTEM.MANAGE_SETTINGS),
    canViewPerformance: hasPermissionUtil(userRole, PERMISSIONS.PERFORMANCE.VIEW),
    canManageSchedule: hasPermissionUtil(userRole, PERMISSIONS.SCHEDULE.MANAGE),
    
    // Role-specific helpers
    isAdmin: hasRoleUtil(userRole, ROLES.ADMIN),
    isSupervisor: hasRoleUtil(userRole, ROLES.SUPERVISOR),
    isInstaller: hasRoleUtil(userRole, ROLES.INSTALLER),
    
    // Feature flags (pre-computed for performance)
    features: {
      // Dashboard features
      dashboard: canAccessFeatureUtil(userRole, 'dashboard'),
      adminDashboard: canAccessFeatureUtil(userRole, 'admin_dashboard'),
      installerDashboard: canAccessFeatureUtil(userRole, 'installer_dashboard'),
      
      // User management
      userManagement: canAccessFeatureUtil(userRole, 'user_management'),
      
      // Installation features
      installationSubmission: canAccessFeatureUtil(userRole, 'installation_submission'),
      meterManagement: canAccessFeatureUtil(userRole, 'meter_management'),
      
      // Schedule features
      scheduleManagement: canAccessFeatureUtil(userRole, 'schedule_management'),
      
      // Reporting features
      reports: canAccessFeatureUtil(userRole, 'reports'),
      performanceAnalytics: canAccessFeatureUtil(userRole, 'performance_analytics'),
      
      // System features
      systemSettings: canAccessFeatureUtil(userRole, 'system_settings'),
      excelUpload: canAccessFeatureUtil(userRole, 'excel_upload')
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
    roleMetadata,
    userPermissions,
    assignableRoles
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

// Convenience hook for installer dashboard access
export const useCanViewInstallerDashboard = () => {
  const { canViewInstallerDashboard } = usePermissions();
  return canViewInstallerDashboard;
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

// Convenience hook for managing installations
export const useCanManageInstallations = () => {
  const { canManageInstallations } = usePermissions();
  return canManageInstallations;
};

// Convenience hook for completing installations
export const useCanCompleteInstallations = () => {
  const { canCompleteInstallations } = usePermissions();
  return canCompleteInstallations;
};

// Convenience hook for Excel upload permission
export const useCanUploadExcel = () => {
  const { features: { excelUpload } } = usePermissions();
  return excelUpload;
};

// Hook for getting user's role information
export const useRoleInfo = () => {
  const { role, roleDisplayName, roleDescription, roleMetadata } = usePermissions();
  return useMemo(() => ({
    role,
    roleDisplayName,
    roleDescription,
    roleMetadata
  }), [role, roleDisplayName, roleDescription, roleMetadata]);
};

// Hook for getting user's permissions list
export const useUserPermissions = () => {
  const { permissions } = usePermissions();
  return permissions;
};

// Hook for checking if user has any of the common administrative permissions
export const useIsAdminUser = () => {
  const { isAdmin, hasAnyPermission } = usePermissions();
  
  // Use the pre-computed isAdmin flag first, fallback to permission check
  if (isAdmin) return true;
  
  return useMemo(() => 
    hasAnyPermission([
      PERMISSIONS.USERS.MANAGE, 
      PERMISSIONS.DASHBOARD.VIEW_ADMIN, 
      PERMISSIONS.SYSTEM.MANAGE_SETTINGS
    ]),
    [hasAnyPermission]
  );
};

// Hook for checking if user can perform installation-related actions
export const useIsInstallerUser = () => {
  const { isInstaller, hasAnyPermission } = usePermissions();
  
  // Use the pre-computed isInstaller flag first
  if (isInstaller) return true;
  
  return useMemo(() => 
    hasAnyPermission([
      PERMISSIONS.INSTALLATIONS.CREATE, 
      PERMISSIONS.DASHBOARD.VIEW_INSTALLER
    ]),
    [hasAnyPermission]
  );
};

// Hook for checking if user is supervisor or higher
export const useIsSupervisorUser = () => {
  const { isSupervisor, isAdmin } = usePermissions();
  return isSupervisor || isAdmin;
};

// Hook for feature-based access control
export const useFeatureFlags = () => {
  const { features } = usePermissions();
  return features;
};

// Hook for role assignment capabilities
export const useRoleAssignment = () => {
  const { assignableRoles, canAssignRole } = usePermissions();
  return useMemo(() => ({
    assignableRoles,
    canAssignRole
  }), [assignableRoles, canAssignRole]);
};

// Higher-order component for permission-based rendering
export const withPermission = (WrappedComponent, requiredPermission) => {
  const PermissionWrapper = (props) => {
    const hasPermission = useHasPermission(requiredPermission);
    
    if (!hasPermission) {
      return null;
    }
    
    return <WrappedComponent {...props} />;
  };

  // Set display name for better debugging
  const wrappedComponentName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  PermissionWrapper.displayName = `withPermission(${wrappedComponentName})`;
  
  return PermissionWrapper;
};

// Higher-order component for role-based rendering
export const withRole = (WrappedComponent, requiredRole) => {
  const RoleWrapper = (props) => {
    const hasRole = useHasRole(requiredRole);
    
    if (!hasRole) {
      return null;
    }
    
    return <WrappedComponent {...props} />;
  };

  // Set display name for better debugging
  const wrappedComponentName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  RoleWrapper.displayName = `withRole(${wrappedComponentName})`;
  
  return RoleWrapper;
};

// Component for conditional rendering based on permissions
export const PermissionGuard = ({ 
  children, 
  permission, 
  permissions, 
  anyPermission, 
  role, 
  feature,
  fallback = null 
}) => {
  const hasPerm = useHasPermission(permission);
  const hasPerms = useHasPermissions(permissions);
  const hasAnyPerm = useHasAnyPermission(anyPermission);
  const hasRequiredRole = useHasRole(role);
  const canAccess = useCanAccessFeature(feature);

  const hasAccess = 
    (permission && hasPerm) ||
    (permissions && hasPerms) ||
    (anyPermission && hasAnyPerm) ||
    (role && hasRequiredRole) ||
    (feature && canAccess);

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

// Component for role-based conditional rendering
export const RoleGuard = ({ 
  children, 
  role, 
  fallback = null 
}) => {
  const hasRequiredRole = useHasRole(role);
  return hasRequiredRole ? children : fallback;
};

export default usePermissions;