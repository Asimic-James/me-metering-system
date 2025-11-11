import { createElement } from 'react';

// Permission definitions
export const PERMISSIONS = {
  // Dashboard Permissions
  VIEW_DASHBOARD: 'view:dashboard',
  VIEW_ADMIN_DASHBOARD: 'view:admin_dashboard',
  VIEW_INSTALLER_DASHBOARD: 'view:installer_dashboard',
  
  // Installation Permissions
  CREATE_INSTALLATION: 'create:installation',
  VIEW_INSTALLATIONS: 'view:installations',
  VIEW_ALL_INSTALLATIONS: 'view:all_installations',
  MANAGE_INSTALLATIONS: 'manage:installations',
  
  // User Management Permissions
  VIEW_USERS: 'view:users',
  MANAGE_USERS: 'manage:users',
  
  // Report Permissions
  VIEW_REPORTS: 'view:reports',
  EXPORT_DATA: 'export:data',
  
  // System Settings
  MANAGE_SETTINGS: 'manage:settings',
  
  // Performance Monitoring
  VIEW_PERFORMANCE: 'view:performance',
  VIEW_ALL_PERFORMANCE: 'view:all_performance'
};

// Role definitions with associated permissions
export const ROLES = {
  ADMIN: 'admin',
  INSTALLER: 'installer'
};

// Permission sets for each role
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_ADMIN_DASHBOARD,
    PERMISSIONS.VIEW_INSTALLER_DASHBOARD,
    PERMISSIONS.CREATE_INSTALLATION,
    PERMISSIONS.VIEW_INSTALLATIONS,
    PERMISSIONS.VIEW_ALL_INSTALLATIONS,
    PERMISSIONS.MANAGE_INSTALLATIONS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.VIEW_PERFORMANCE,
    PERMISSIONS.VIEW_ALL_PERFORMANCE
  ],
  [ROLES.INSTALLER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_INSTALLER_DASHBOARD,
    PERMISSIONS.CREATE_INSTALLATION,
    PERMISSIONS.VIEW_INSTALLATIONS,
    PERMISSIONS.VIEW_PERFORMANCE
  ]
};

// Permission checking utility
export const hasPermission = (userRole, permission) => {
  if (!userRole || !permission) return false;
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
};

// Multiple permissions checking utility
export const hasPermissions = (userRole, permissions) => {
  if (!userRole || !permissions) return false;
  return permissions.every(permission => hasPermission(userRole, permission));
};

// Role checking utility
export const hasRole = (userRole, requiredRole) => {
  return userRole === requiredRole;
};

// Protected component wrapper for permission-based access control
export const withPermission = (WrappedComponent, requiredPermission) => {
  return function PermissionWrapper({ userRole, ...props }) {
    if (!hasPermission(userRole, requiredPermission)) {
      return createElement(
        'div',
        { className: 'p-4 text-center' },
        createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, 'Access Denied'),
        createElement('p', { className: 'text-gray-600' }, `You don't have permission to view this content.`)
      );
    }
    return createElement(WrappedComponent, props);
  };
};