// src/components/auth/permissions.js
// Optimized permissions system aligned with latest app version

// Role definitions
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  INSTALLER: 'installer'
});

// Permission definitions organized by feature
export const PERMISSIONS = Object.freeze({
  // Dashboard permissions
  DASHBOARD: {
    VIEW: 'dashboard:view',
    VIEW_ADMIN: 'dashboard:view_admin',
    VIEW_INSTALLER: 'dashboard:view_installer'
  },
  
  // Installation permissions
  INSTALLATIONS: {
    CREATE: 'installations:create',
    VIEW: 'installations:view',
    VIEW_ALL: 'installations:view_all',
    MANAGE: 'installations:manage',
    COMPLETE: 'installations:complete'
  },
  
  // User management permissions
  USERS: {
    VIEW: 'users:view',
    CREATE: 'users:create',
    UPDATE: 'users:update',
    DELETE: 'users:delete',
    MANAGE: 'users:manage'
  },
  
  // Reports permissions
  REPORTS: {
    VIEW: 'reports:view',
    EXPORT: 'reports:export',
    GENERATE: 'reports:generate'
  },
  
  // Schedule permissions
  SCHEDULE: {
    VIEW: 'schedule:view',
    MANAGE: 'schedule:manage'
  },
  
  // Settings permissions
  SETTINGS: {
    VIEW: 'settings:view',
    MANAGE: 'settings:manage'
  },
  
  // Upload permissions
  UPLOADS: {
    EXCEL: 'uploads:excel',
    FILES: 'uploads:files'
  },
  
  // Complaint permissions
  COMPLAINTS: {
    CREATE: 'complaints:create',
    VIEW: 'complaints:view',
    MANAGE: 'complaints:manage'
  }
});

// Role-based permissions mapping
const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMIN]: new Set([
    // Dashboard - Full access
    PERMISSIONS.DASHBOARD.VIEW,
    PERMISSIONS.DASHBOARD.VIEW_ADMIN,
    PERMISSIONS.DASHBOARD.VIEW_INSTALLER,
    
    // Installations - Full access
    PERMISSIONS.INSTALLATIONS.CREATE,
    PERMISSIONS.INSTALLATIONS.VIEW,
    PERMISSIONS.INSTALLATIONS.VIEW_ALL,
    PERMISSIONS.INSTALLATIONS.MANAGE,
    PERMISSIONS.INSTALLATIONS.COMPLETE,
    
    // Users - Full access
    PERMISSIONS.USERS.VIEW,
    PERMISSIONS.USERS.CREATE,
    PERMISSIONS.USERS.UPDATE,
    PERMISSIONS.USERS.DELETE,
    PERMISSIONS.USERS.MANAGE,
    
    // Reports - Full access
    PERMISSIONS.REPORTS.VIEW,
    PERMISSIONS.REPORTS.EXPORT,
    PERMISSIONS.REPORTS.GENERATE,
    
    // Schedule - Full access
    PERMISSIONS.SCHEDULE.VIEW,
    PERMISSIONS.SCHEDULE.MANAGE,
    
    // Settings - Full access
    PERMISSIONS.SETTINGS.VIEW,
    PERMISSIONS.SETTINGS.MANAGE,
    
    // Uploads - Full access
    PERMISSIONS.UPLOADS.EXCEL,
    PERMISSIONS.UPLOADS.FILES,
    
    // Complaints - Full access
    PERMISSIONS.COMPLAINTS.CREATE,
    PERMISSIONS.COMPLAINTS.VIEW,
    PERMISSIONS.COMPLAINTS.MANAGE
  ]),
  
  [ROLES.INSTALLER]: new Set([
    // Dashboard - Installer view only
    PERMISSIONS.DASHBOARD.VIEW,
    PERMISSIONS.DASHBOARD.VIEW_INSTALLER,
    
    // Installations - Limited access
    PERMISSIONS.INSTALLATIONS.CREATE,
    PERMISSIONS.INSTALLATIONS.VIEW,
    PERMISSIONS.INSTALLATIONS.COMPLETE,
    
    // Schedule - View only
    PERMISSIONS.SCHEDULE.VIEW,
    
    // Uploads - Excel only
    PERMISSIONS.UPLOADS.EXCEL,
    
    // Complaints - Create only
    PERMISSIONS.COMPLAINTS.CREATE
  ])
});

// Page access configuration - Maps pages to required permissions
const PAGE_ACCESS = Object.freeze({
  dashboard: [PERMISSIONS.DASHBOARD.VIEW],
  schedule: [PERMISSIONS.SCHEDULE.VIEW],
  submit: [PERMISSIONS.INSTALLATIONS.CREATE],
  users: [PERMISSIONS.USERS.VIEW],
  reports: [PERMISSIONS.REPORTS.VIEW],
  uploads: [PERMISSIONS.UPLOADS.EXCEL],
  settings: [PERMISSIONS.SETTINGS.VIEW],
  complaint: [PERMISSIONS.COMPLAINTS.CREATE]
});

// Permission check with caching
const permissionCache = new Map();

/**
 * Check if a role has a specific permission
 */
export const hasPermission = (userRole, permission) => {
  if (!userRole || !permission) return false;
  
  // Admin has all permissions
  if (userRole === ROLES.ADMIN) return true;
  
  // Check cache
  const cacheKey = `${userRole}:${permission}`;
  if (permissionCache.has(cacheKey)) {
    return permissionCache.get(cacheKey);
  }
  
  // Check permission
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  const result = rolePermissions ? rolePermissions.has(permission) : false;
  
  // Cache result
  permissionCache.set(cacheKey, result);
  
  return result;
};

/**
 * Check if role has all permissions
 */
export const hasPermissions = (userRole, permissions) => {
  if (!userRole || !Array.isArray(permissions)) return false;
  if (permissions.length === 0) return true;
  
  // Admin has all permissions
  if (userRole === ROLES.ADMIN) return true;
  
  return permissions.every(permission => hasPermission(userRole, permission));
};

/**
 * Check if role has any of the permissions
 */
export const hasAnyPermission = (userRole, permissions) => {
  if (!userRole || !Array.isArray(permissions)) return false;
  if (permissions.length === 0) return false;
  
  // Admin has all permissions
  if (userRole === ROLES.ADMIN) return true;
  
  return permissions.some(permission => hasPermission(userRole, permission));
};

/**
 * Check if user can access a specific page
 */
export const canAccessPage = (userRole, pageName) => {
  if (!userRole || !pageName) return false;
  
  // Admin can access all pages
  if (userRole === ROLES.ADMIN) return true;
  
  const requiredPermissions = PAGE_ACCESS[pageName];
  if (!requiredPermissions) return false;
  
  return hasAnyPermission(userRole, requiredPermissions);
};

/**
 * Get all permissions for a role
 */
export const getAllPermissionsForRole = (userRole) => {
  if (!userRole) return [];
  
  const permissionSet = ROLE_PERMISSIONS[userRole];
  return permissionSet ? Array.from(permissionSet) : [];
};

/**
 * Get role metadata
 */
export const getRoleMetadata = (role) => {
  const metadata = {
    [ROLES.ADMIN]: {
      displayName: 'Administrator',
      description: 'Full system access',
      level: 2,
      color: 'purple'
    },
    [ROLES.INSTALLER]: {
      displayName: 'Installer',
      description: 'Field technician',
      level: 1,
      color: 'blue'
    }
  };
  
  return metadata[role] || {};
};

/**
 * Get display name for a permission
 */
export const getPermissionDisplayName = (permission) => {
  const names = {
    [PERMISSIONS.DASHBOARD.VIEW]: 'View Dashboard',
    [PERMISSIONS.DASHBOARD.VIEW_ADMIN]: 'View Admin Dashboard',
    [PERMISSIONS.DASHBOARD.VIEW_INSTALLER]: 'View Installer Dashboard',
    [PERMISSIONS.INSTALLATIONS.CREATE]: 'Create Installation',
    [PERMISSIONS.INSTALLATIONS.VIEW]: 'View Installations',
    [PERMISSIONS.INSTALLATIONS.VIEW_ALL]: 'View All Installations',
    [PERMISSIONS.INSTALLATIONS.MANAGE]: 'Manage Installations',
    [PERMISSIONS.INSTALLATIONS.COMPLETE]: 'Complete Installations',
    [PERMISSIONS.USERS.VIEW]: 'View Users',
    [PERMISSIONS.USERS.CREATE]: 'Create Users',
    [PERMISSIONS.USERS.UPDATE]: 'Update Users',
    [PERMISSIONS.USERS.DELETE]: 'Delete Users',
    [PERMISSIONS.USERS.MANAGE]: 'Manage Users',
    [PERMISSIONS.REPORTS.VIEW]: 'View Reports',
    [PERMISSIONS.REPORTS.EXPORT]: 'Export Reports',
    [PERMISSIONS.REPORTS.GENERATE]: 'Generate Reports',
    [PERMISSIONS.SCHEDULE.VIEW]: 'View Schedule',
    [PERMISSIONS.SCHEDULE.MANAGE]: 'Manage Schedule',
    [PERMISSIONS.SETTINGS.VIEW]: 'View Settings',
    [PERMISSIONS.SETTINGS.MANAGE]: 'Manage Settings',
    [PERMISSIONS.UPLOADS.EXCEL]: 'Upload Excel Files',
    [PERMISSIONS.UPLOADS.FILES]: 'Upload Files',
    [PERMISSIONS.COMPLAINTS.CREATE]: 'Create Complaints',
    [PERMISSIONS.COMPLAINTS.VIEW]: 'View Complaints',
    [PERMISSIONS.COMPLAINTS.MANAGE]: 'Manage Complaints'
  };
  
  return names[permission] || permission;
};

/**
 * Clear permission cache
 */
export const clearPermissionCache = () => {
  permissionCache.clear();
};

export default {
  ROLES,
  PERMISSIONS,
  hasPermission,
  hasPermissions,
  hasAnyPermission,
  canAccessPage,
  getAllPermissionsForRole,
  getRoleMetadata,
  getPermissionDisplayName,
  clearPermissionCache
};