// Permission definitions with categories and metadata
export const PERMISSIONS = Object.freeze({
  // Dashboard & Overview
  DASHBOARD: {
    VIEW: 'view:dashboard',
    VIEW_ADMIN: 'view:admin_dashboard',
    VIEW_INSTALLER: 'view:installer_dashboard',
  },
  
  // Installation Management
  INSTALLATIONS: {
    CREATE: 'create:installation',
    VIEW: 'view:installations',
    VIEW_ALL: 'view:all_installations',
    MANAGE: 'manage:installations',
    COMPLETE: 'complete:installation',
  },
  
  // User Management
  USERS: {
    VIEW: 'view:users',
    CREATE: 'create:user',
    UPDATE: 'update:user',
    DELETE: 'delete:user',
    MANAGE: 'manage:users',
  },
  
  // Reports & Analytics
  REPORTS: {
    VIEW: 'view:reports',
    EXPORT: 'export:data',
    GENERATE: 'generate:reports',
  },
  
  // System & Settings
  SYSTEM: {
    MANAGE_SETTINGS: 'manage:settings',
    VIEW_LOGS: 'view:logs',
    MANAGE_INTEGRATIONS: 'manage:integrations',
  },
  
  // Performance & Monitoring
  PERFORMANCE: {
    VIEW: 'view:performance',
    VIEW_ALL: 'view:all_performance',
    MANAGE_METRICS: 'manage:metrics',
  },
  
  // Schedule & Planning
  SCHEDULE: {
    VIEW: 'view:schedule',
    MANAGE: 'manage:schedule',
    ASSIGN: 'assign:installations',
  }
});

// Role definitions
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  INSTALLER: 'installer',
  SUPERVISOR: 'supervisor'
});

// Precomputed permission sets for better performance
const PERMISSION_SETS = (() => {
  const sets = {};
  
  // Convert permissions to flat sets for quick lookup
  for (const [category, permissions] of Object.entries(PERMISSIONS)) {
    sets[category] = new Set(Object.values(permissions));
  }
  
  // Create a complete set of all permissions
  sets.ALL = new Set(
    Object.values(PERMISSIONS).flatMap(category => Object.values(category))
  );
  
  return Object.freeze(sets);
})();

// Role hierarchy with inheritance
const ROLE_HIERARCHY = Object.freeze({
  [ROLES.ADMIN]: [ROLES.SUPERVISOR, ROLES.INSTALLER],
  [ROLES.SUPERVISOR]: [ROLES.INSTALLER],
  [ROLES.INSTALLER]: []
});

// Precomputed role permissions with inheritance
const ROLE_PERMISSIONS = (() => {
  const basePermissions = {
    [ROLES.ADMIN]: [
      PERMISSIONS.DASHBOARD.VIEW,
      PERMISSIONS.DASHBOARD.VIEW_ADMIN,
      PERMISSIONS.DASHBOARD.VIEW_INSTALLER,
      PERMISSIONS.INSTALLATIONS.CREATE,
      PERMISSIONS.INSTALLATIONS.VIEW,
      PERMISSIONS.INSTALLATIONS.VIEW_ALL,
      PERMISSIONS.INSTALLATIONS.MANAGE,
      PERMISSIONS.INSTALLATIONS.COMPLETE,
      PERMISSIONS.USERS.VIEW,
      PERMISSIONS.USERS.CREATE,
      PERMISSIONS.USERS.UPDATE,
      PERMISSIONS.USERS.DELETE,
      PERMISSIONS.USERS.MANAGE,
      PERMISSIONS.REPORTS.VIEW,
      PERMISSIONS.REPORTS.EXPORT,
      PERMISSIONS.REPORTS.GENERATE,
      PERMISSIONS.SYSTEM.MANAGE_SETTINGS,
      PERMISSIONS.SYSTEM.VIEW_LOGS,
      PERMISSIONS.SYSTEM.MANAGE_INTEGRATIONS,
      PERMISSIONS.PERFORMANCE.VIEW,
      PERMISSIONS.PERFORMANCE.VIEW_ALL,
      PERMISSIONS.PERFORMANCE.MANAGE_METRICS,
      PERMISSIONS.SCHEDULE.VIEW,
      PERMISSIONS.SCHEDULE.MANAGE,
      PERMISSIONS.SCHEDULE.ASSIGN,
    ],
    
    [ROLES.INSTALLER]: [
      PERMISSIONS.DASHBOARD.VIEW,
      PERMISSIONS.DASHBOARD.VIEW_INSTALLER,
      PERMISSIONS.INSTALLATIONS.CREATE,
      PERMISSIONS.INSTALLATIONS.VIEW,
      PERMISSIONS.INSTALLATIONS.COMPLETE,
      PERMISSIONS.SCHEDULE.VIEW,
      PERMISSIONS.PERFORMANCE.VIEW,
    ],
    
    [ROLES.SUPERVISOR]: [
      PERMISSIONS.DASHBOARD.VIEW,
      PERMISSIONS.DASHBOARD.VIEW_ADMIN,
      PERMISSIONS.DASHBOARD.VIEW_INSTALLER,
      PERMISSIONS.INSTALLATIONS.CREATE,
      PERMISSIONS.INSTALLATIONS.VIEW,
      PERMISSIONS.INSTALLATIONS.VIEW_ALL,
      PERMISSIONS.INSTALLATIONS.MANAGE,
      PERMISSIONS.INSTALLATIONS.COMPLETE,
      PERMISSIONS.USERS.VIEW,
      PERMISSIONS.REPORTS.VIEW,
      PERMISSIONS.REPORTS.EXPORT,
      PERMISSIONS.PERFORMANCE.VIEW,
      PERMISSIONS.PERFORMANCE.VIEW_ALL,
      PERMISSIONS.SCHEDULE.VIEW,
      PERMISSIONS.SCHEDULE.MANAGE,
      PERMISSIONS.SCHEDULE.ASSIGN,
    ]
  };

  // Apply inheritance and convert to Sets
  const rolePermissions = {};
  
  for (const [role, permissions] of Object.entries(basePermissions)) {
    const permissionSet = new Set(permissions);
    
    // Add inherited permissions
    const inheritedRoles = ROLE_HIERARCHY[role] || [];
    for (const inheritedRole of inheritedRoles) {
      const inheritedPermissions = basePermissions[inheritedRole] || [];
      inheritedPermissions.forEach(permission => permissionSet.add(permission));
    }
    
    rolePermissions[role] = Object.freeze(permissionSet);
  }
  
  return Object.freeze(rolePermissions);
})();

// Role metadata for UI display
const ROLE_METADATA = Object.freeze({
  [ROLES.ADMIN]: {
    displayName: 'Administrator',
    description: 'Full system access with all permissions',
    level: 3,
    color: 'purple'
  },
  [ROLES.SUPERVISOR]: {
    displayName: 'Supervisor',
    description: 'Can manage installations and view reports',
    level: 2,
    color: 'blue'
  },
  [ROLES.INSTALLER]: {
    displayName: 'Installer',
    description: 'Can submit installations and view own schedule',
    level: 1,
    color: 'green'
  }
});

// Feature access mapping
const FEATURE_PERMISSIONS = Object.freeze({
  dashboard: [PERMISSIONS.DASHBOARD.VIEW],
  admin_dashboard: [PERMISSIONS.DASHBOARD.VIEW_ADMIN],
  user_management: [PERMISSIONS.USERS.VIEW, PERMISSIONS.USERS.MANAGE],
  installation_submission: [PERMISSIONS.INSTALLATIONS.CREATE],
  schedule_management: [PERMISSIONS.SCHEDULE.VIEW, PERMISSIONS.SCHEDULE.MANAGE],
  reports: [PERMISSIONS.REPORTS.VIEW],
  performance_analytics: [PERMISSIONS.PERFORMANCE.VIEW],
  meter_management: [PERMISSIONS.INSTALLATIONS.VIEW, PERMISSIONS.INSTALLATIONS.MANAGE],
  system_settings: [PERMISSIONS.SYSTEM.MANAGE_SETTINGS]
});

// Cache for permission checks
const permissionCache = new Map();

/**
 * Check if a user role has a specific permission
 * Uses caching for better performance
 */
export const hasPermission = (userRole, permission) => {
  if (!userRole || !permission) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('hasPermission: Missing userRole or permission', { userRole, permission });
    }
    return false;
  }

  // Check cache first
  const cacheKey = `${userRole}:${permission}`;
  if (permissionCache.has(cacheKey)) {
    return permissionCache.get(cacheKey);
  }

  const rolePermissions = ROLE_PERMISSIONS[userRole];
  const hasPerm = rolePermissions ? rolePermissions.has(permission) : false;
  
  // Cache the result
  permissionCache.set(cacheKey, hasPerm);
  
  return hasPerm;
};

/**
 * Check if user has all required permissions
 */
export const hasPermissions = (userRole, permissions) => {
  if (!userRole || !permissions || !Array.isArray(permissions)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('hasPermissions: Invalid parameters', { userRole, permissions });
    }
    return false;
  }

  // Short-circuit if empty array
  if (permissions.length === 0) return true;

  return permissions.every(permission => hasPermission(userRole, permission));
};

/**
 * Check if user has at least one of the required permissions
 */
export const hasAnyPermission = (userRole, permissions) => {
  if (!userRole || !permissions || !Array.isArray(permissions)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('hasAnyPermission: Invalid parameters', { userRole, permissions });
    }
    return false;
  }

  // Short-circuit if empty array
  if (permissions.length === 0) return false;

  return permissions.some(permission => hasPermission(userRole, permission));
};

/**
 * Check if user has a specific role or superior role
 */
export const hasRole = (userRole, requiredRole) => {
  if (!userRole || !requiredRole) return false;

  if (userRole === requiredRole) return true;

  // Check role hierarchy
  const superiorRoles = ROLE_HIERARCHY[userRole] || [];
  return superiorRoles.includes(requiredRole);
};

/**
 * Check if user can access a specific feature
 */
export const canAccessFeature = (userRole, feature) => {
  const requiredPermissions = FEATURE_PERMISSIONS[feature];
  
  if (!requiredPermissions) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Unknown feature: ${feature}`);
    }
    return false;
  }

  return hasAnyPermission(userRole, requiredPermissions);
};

/**
 * Get all permissions for a role (including inherited)
 */
export const getAllPermissionsForRole = (userRole) => {
  if (!userRole) return [];
  
  const permissionSet = ROLE_PERMISSIONS[userRole];
  return permissionSet ? Array.from(permissionSet) : [];
};

/**
 * Get role display name
 */
export const getRoleDisplayName = (role) => {
  return ROLE_METADATA[role]?.displayName || role;
};

/**
 * Get role description
 */
export const getRoleDescription = (role) => {
  return ROLE_METADATA[role]?.description || 'No description available';
};

/**
 * Get role metadata
 */
export const getRoleMetadata = (role) => {
  return ROLE_METADATA[role] || {};
};

/**
 * Get all available roles
 */
export const getAvailableRoles = () => {
  return Object.values(ROLES);
};

/**
 * Get roles that the current user can assign
 */
export const getAssignableRoles = (currentUserRole) => {
  if (!currentUserRole) return [];
  
  const currentRoleLevel = ROLE_METADATA[currentUserRole]?.level || 0;
  
  return getAvailableRoles().filter(role => {
    const roleLevel = ROLE_METADATA[role]?.level || 0;
    return roleLevel < currentRoleLevel;
  });
};

/**
 * Check if current user can assign a role to another user
 */
export const canAssignRole = (currentUserRole, targetRole) => {
  if (!currentUserRole || !targetRole) return false;
  
  const currentRoleLevel = ROLE_METADATA[currentUserRole]?.level || 0;
  const targetRoleLevel = ROLE_METADATA[targetRole]?.level || 0;
  
  return targetRoleLevel < currentRoleLevel;
};

/**
 * Clear permission cache (useful for testing or role changes)
 */
export const clearPermissionCache = () => {
  permissionCache.clear();
};

/**
 * React Hook for permission management
 */
export const usePermissions = (userRole) => {
  const memoizedUtils = useMemo(() => ({
    hasPermission: (permission) => hasPermission(userRole, permission),
    hasPermissions: (permissions) => hasPermissions(userRole, permissions),
    hasAnyPermission: (permissions) => hasAnyPermission(userRole, permissions),
    hasRole: (role) => hasRole(userRole, role),
    canAccessFeature: (feature) => canAccessFeature(userRole, feature),
    getAllPermissions: () => getAllPermissionsForRole(userRole),
    getRoleDisplayName: () => getRoleDisplayName(userRole),
    getRoleDescription: () => getRoleDescription(userRole),
    getRoleMetadata: () => getRoleMetadata(userRole),
    getAssignableRoles: () => getAssignableRoles(userRole),
    canAssignRole: (targetRole) => canAssignRole(userRole, targetRole)
  }), [userRole]);

  return memoizedUtils;
};

/**
 * Higher-Order Component for permission-based access control
 */
export const withPermission = (WrappedComponent, requiredPermission) => {
  const PermissionWrapper = ({ userRole, ...props }) => {
    if (!hasPermission(userRole, requiredPermission)) {
      return (
        <div className="p-6 text-center bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Access Denied</h3>
            <p className="text-gray-600 max-w-sm">
              You don't have permission to access this content.
            </p>
          </div>
        </div>
      );
    }
    
    return <WrappedComponent {...props} />;
  };

  // Set display name for better debugging
  const wrappedComponentName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  PermissionWrapper.displayName = `withPermission(${wrappedComponentName})`;
  
  return PermissionWrapper;
};

/**
 * Permission Guard component for conditional rendering
 */
export const PermissionGuard = ({ 
  userRole, 
  permission, 
  permissions, 
  anyPermission, 
  role, 
  feature,
  fallback = null,
  children 
}) => {
  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(userRole, permission);
  } else if (permissions) {
    hasAccess = hasPermissions(userRole, permissions);
  } else if (anyPermission) {
    hasAccess = hasAnyPermission(userRole, anyPermission);
  } else if (role) {
    hasAccess = hasRole(userRole, role);
  } else if (feature) {
    hasAccess = canAccessFeature(userRole, feature);
  }

  return hasAccess ? children : fallback;
};

// Export constants
export { PERMISSION_SETS, ROLE_METADATA, FEATURE_PERMISSIONS };

// Default export for convenience
export default {
  PERMISSIONS,
  ROLES,
  ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
  hasPermission,
  hasPermissions,
  hasAnyPermission,
  hasRole,
  canAccessFeature,
  getAllPermissionsForRole,
  getRoleDisplayName,
  getRoleDescription,
  getRoleMetadata,
  getAvailableRoles,
  getAssignableRoles,
  canAssignRole,
  clearPermissionCache,
  usePermissions,
  withPermission,
  PermissionGuard
};