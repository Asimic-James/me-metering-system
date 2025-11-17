import { createElement } from 'react';

// Permission definitions with categories for better organization
export const PERMISSIONS = {
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
};

// Flatten permissions for easier access in components
export const FLAT_PERMISSIONS = Object.values(PERMISSIONS).reduce((acc, category) => {
  Object.values(category).forEach(permission => {
    acc[permission] = permission;
  });
  return acc;
}, {});

// Role definitions with associated permissions
export const ROLES = {
  ADMIN: 'admin',
  INSTALLER: 'installer',
  SUPERVISOR: 'supervisor' // Added for future role hierarchy
};

// Permission sets for each role
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    // Dashboard
    PERMISSIONS.DASHBOARD.VIEW,
    PERMISSIONS.DASHBOARD.VIEW_ADMIN,
    PERMISSIONS.DASHBOARD.VIEW_INSTALLER,
    
    // Installations
    PERMISSIONS.INSTALLATIONS.CREATE,
    PERMISSIONS.INSTALLATIONS.VIEW,
    PERMISSIONS.INSTALLATIONS.VIEW_ALL,
    PERMISSIONS.INSTALLATIONS.MANAGE,
    PERMISSIONS.INSTALLATIONS.COMPLETE,
    
    // Users
    PERMISSIONS.USERS.VIEW,
    PERMISSIONS.USERS.CREATE,
    PERMISSIONS.USERS.UPDATE,
    PERMISSIONS.USERS.DELETE,
    PERMISSIONS.USERS.MANAGE,
    
    // Reports
    PERMISSIONS.REPORTS.VIEW,
    PERMISSIONS.REPORTS.EXPORT,
    PERMISSIONS.REPORTS.GENERATE,
    
    // System
    PERMISSIONS.SYSTEM.MANAGE_SETTINGS,
    PERMISSIONS.SYSTEM.VIEW_LOGS,
    PERMISSIONS.SYSTEM.MANAGE_INTEGRATIONS,
    
    // Performance
    PERMISSIONS.PERFORMANCE.VIEW,
    PERMISSIONS.PERFORMANCE.VIEW_ALL,
    PERMISSIONS.PERFORMANCE.MANAGE_METRICS,
    
    // Schedule
    PERMISSIONS.SCHEDULE.VIEW,
    PERMISSIONS.SCHEDULE.MANAGE,
    PERMISSIONS.SCHEDULE.ASSIGN,
  ],
  
  [ROLES.INSTALLER]: [
    // Dashboard
    PERMISSIONS.DASHBOARD.VIEW,
    PERMISSIONS.DASHBOARD.VIEW_INSTALLER,
    
    // Installations
    PERMISSIONS.INSTALLATIONS.CREATE,
    PERMISSIONS.INSTALLATIONS.VIEW,
    PERMISSIONS.INSTALLATIONS.COMPLETE,
    
    // Schedule
    PERMISSIONS.SCHEDULE.VIEW,
    
    // Performance (own only)
    PERMISSIONS.PERFORMANCE.VIEW,
  ],
  
  [ROLES.SUPERVISOR]: [
    // Dashboard
    PERMISSIONS.DASHBOARD.VIEW,
    PERMISSIONS.DASHBOARD.VIEW_ADMIN,
    PERMISSIONS.DASHBOARD.VIEW_INSTALLER,
    
    // Installations
    PERMISSIONS.INSTALLATIONS.CREATE,
    PERMISSIONS.INSTALLATIONS.VIEW,
    PERMISSIONS.INSTALLATIONS.VIEW_ALL,
    PERMISSIONS.INSTALLATIONS.MANAGE,
    PERMISSIONS.INSTALLATIONS.COMPLETE,
    
    // Users (view only)
    PERMISSIONS.USERS.VIEW,
    
    // Reports
    PERMISSIONS.REPORTS.VIEW,
    PERMISSIONS.REPORTS.EXPORT,
    
    // Performance
    PERMISSIONS.PERFORMANCE.VIEW,
    PERMISSIONS.PERFORMANCE.VIEW_ALL,
    
    // Schedule
    PERMISSIONS.SCHEDULE.VIEW,
    PERMISSIONS.SCHEDULE.MANAGE,
    PERMISSIONS.SCHEDULE.ASSIGN,
  ]
};

// Role hierarchy for permission inheritance
export const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: [ROLES.SUPERVISOR, ROLES.INSTALLER],
  [ROLES.SUPERVISOR]: [ROLES.INSTALLER],
  [ROLES.INSTALLER]: []
};

// Permission checking utility
export const hasPermission = (userRole, permission) => {
  if (!userRole || !permission) {
    console.warn('hasPermission: Missing userRole or permission', { userRole, permission });
    return false;
  }

  // Check direct permissions
  const directPermissions = ROLE_PERMISSIONS[userRole];
  if (directPermissions?.includes(permission)) {
    return true;
  }

  // Check hierarchical permissions
  const inheritedRoles = ROLE_HIERARCHY[userRole] || [];
  for (const inheritedRole of inheritedRoles) {
    const inheritedPermissions = ROLE_PERMISSIONS[inheritedRole];
    if (inheritedPermissions?.includes(permission)) {
      return true;
    }
  }

  return false;
};

// Multiple permissions checking utility (all required)
export const hasPermissions = (userRole, permissions) => {
  if (!userRole || !permissions || !Array.isArray(permissions)) {
    console.warn('hasPermissions: Invalid parameters', { userRole, permissions });
    return false;
  }

  return permissions.every(permission => hasPermission(userRole, permission));
};

// Any permission checking utility (at least one required)
export const hasAnyPermission = (userRole, permissions) => {
  if (!userRole || !permissions || !Array.isArray(permissions)) {
    console.warn('hasAnyPermission: Invalid parameters', { userRole, permissions });
    return false;
  }

  return permissions.some(permission => hasPermission(userRole, permission));
};

// Role checking utility
export const hasRole = (userRole, requiredRole) => {
  if (!userRole || !requiredRole) {
    return false;
  }

  if (userRole === requiredRole) {
    return true;
  }

  // Check role hierarchy
  const superiorRoles = ROLE_HIERARCHY[userRole] || [];
  return superiorRoles.includes(requiredRole);
};

// Get all permissions for a role (including inherited)
export const getAllPermissionsForRole = (userRole) => {
  if (!userRole) return new Set();

  const permissions = new Set(ROLE_PERMISSIONS[userRole] || []);

  // Add inherited permissions
  const inheritedRoles = ROLE_HIERARCHY[userRole] || [];
  inheritedRoles.forEach(role => {
    const inheritedPermissions = ROLE_PERMISSIONS[role] || [];
    inheritedPermissions.forEach(permission => permissions.add(permission));
  });

  return Array.from(permissions);
};

// Check if user has access to a specific feature
export const canAccessFeature = (userRole, feature) => {
  const featurePermissions = {
    dashboard: [PERMISSIONS.DASHBOARD.VIEW],
    admin_dashboard: [PERMISSIONS.DASHBOARD.VIEW_ADMIN],
    user_management: [PERMISSIONS.USERS.VIEW, PERMISSIONS.USERS.MANAGE],
    installation_submission: [PERMISSIONS.INSTALLATIONS.CREATE],
    schedule_management: [PERMISSIONS.SCHEDULE.VIEW, PERMISSIONS.SCHEDULE.MANAGE],
    reports: [PERMISSIONS.REPORTS.VIEW],
    performance_analytics: [PERMISSIONS.PERFORMANCE.VIEW]
  };

  const requiredPermissions = featurePermissions[feature];
  if (!requiredPermissions) {
    console.warn(`Unknown feature: ${feature}`);
    return false;
  }

  return hasAnyPermission(userRole, requiredPermissions);
};

// Get user's role display name
export const getRoleDisplayName = (role) => {
  const roleDisplayNames = {
    [ROLES.ADMIN]: 'Administrator',
    [ROLES.SUPERVISOR]: 'Supervisor',
    [ROLES.INSTALLER]: 'Installer'
  };

  return roleDisplayNames[role] || role;
};

// Get role description
export const getRoleDescription = (role) => {
  const roleDescriptions = {
    [ROLES.ADMIN]: 'Full system access with all permissions',
    [ROLES.SUPERVISOR]: 'Can manage installations and view reports',
    [ROLES.INSTALLER]: 'Can submit installations and view own schedule'
  };

  return roleDescriptions[role] || 'No description available';
};

// Protected component wrapper for permission-based access control
export const withPermission = (WrappedComponent, requiredPermission) => {
  return function PermissionWrapper({ userRole, ...props }) {
    if (!hasPermission(userRole, requiredPermission)) {
      return createElement(
        'div',
        { 
          className: 'p-6 text-center bg-white rounded-lg shadow-sm border border-gray-200' 
        },
        createElement(
          'div',
          { className: 'flex flex-col items-center justify-center space-y-3' },
          createElement(
            'div',
            { 
              className: 'w-12 h-12 bg-red-100 rounded-full flex items-center justify-center' 
            },
            createElement(
              'svg',
              { 
                className: 'w-6 h-6 text-red-600',
                fill: 'none',
                stroke: 'currentColor',
                viewBox: '0 0 24 24'
              },
              createElement('path', {
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: 2,
                d: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
              })
            )
          ),
          createElement(
            'h3', 
            { className: 'text-lg font-semibold text-gray-900' },
            'Access Denied'
          ),
          createElement(
            'p', 
            { className: 'text-gray-600 max-w-sm' },
            `You don't have permission to access this content. Required permission: ${requiredPermission}`
          )
        )
      );
    }
    
    return createElement(WrappedComponent, props);
  };
};

// Hook-style permission checker (for functional components)
export const usePermissions = (userRole) => {
  return {
    hasPermission: (permission) => hasPermission(userRole, permission),
    hasPermissions: (permissions) => hasPermissions(userRole, permissions),
    hasAnyPermission: (permissions) => hasAnyPermission(userRole, permissions),
    hasRole: (role) => hasRole(userRole, role),
    canAccessFeature: (feature) => canAccessFeature(userRole, feature),
    getAllPermissions: () => getAllPermissionsForRole(userRole),
    getRoleDisplayName: () => getRoleDisplayName(userRole),
    getRoleDescription: () => getRoleDescription(userRole)
  };
};

// Default export for convenience
export default {
  PERMISSIONS,
  FLAT_PERMISSIONS,
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
  withPermission,
  usePermissions
};