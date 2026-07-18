// src/components/auth/permissions.js
// ============================================
// Central permission & role catalog — single source of truth
// consumed by usePermissions.js and App.jsx's route guards.
// ============================================

export const ROLES = {
  ADMIN: 'admin',
  INSTALLER: 'installer',
};

/**
 * Permission identifiers as flat "group:action" strings — easy to log,
 * compare, and eventually drive from a backend-issued ACL without
 * importing this module.
 */
export const PERMISSIONS = {
  DASHBOARD: {
    VIEW: 'dashboard:view',
    VIEW_ADMIN: 'dashboard:view_admin',
    VIEW_INSTALLER: 'dashboard:view_installer',
  },
  INSTALLATIONS: {
    CREATE: 'installations:create',      // record a completed install (Install Meter form)
    VIEW: 'installations:view',          // view own installations (API layer scopes to installer)
    VIEW_ALL: 'installations:view_all',  // view every installer's installations (admin pipeline view)
    MANAGE: 'installations:manage',      // edit / reassign / cancel a request
    COMPLETE: 'installations:complete',  // mark a job complete from Meter Schedule
  },
  USERS: {
    VIEW: 'users:view',
    CREATE: 'users:create',
    UPDATE: 'users:update',
    DELETE: 'users:delete',
  },
  REPORTS: {
    VIEW: 'reports:view',
    EXPORT: 'reports:export',
    GENERATE: 'reports:generate',
  },
  SCHEDULE: {
    VIEW: 'schedule:view',      // Meter Schedule — pull jobs ready to install
    MANAGE: 'schedule:manage',  // reassign/reschedule jobs across installers
  },
  SETTINGS: {
    VIEW: 'settings:view',
    MANAGE: 'settings:manage',  // meter types, system settings
  },
  UPLOADS: {
    EXCEL: 'uploads:excel',     // bulk meter upload
    FILES: 'uploads:files',
  },
  COMPLAINTS: {
    CREATE: 'complaints:create',
    VIEW: 'complaints:view',
    MANAGE: 'complaints:manage',
  },
};

// Flatten PERMISSIONS into a single array of every permission string.
const flattenPermissions = (obj) =>
  Object.values(obj).flatMap((group) =>
    typeof group === 'string' ? [group] : flattenPermissions(group)
  );

export const ALL_PERMISSIONS = flattenPermissions(PERMISSIONS);

/**
 * Role -> permission map.
 *
 * Admin is intentionally NOT enumerated here. hasPermission() grants admin
 * universal access directly — "the admin should be able to access
 * everything" — so this map only needs to describe the restricted role(s).
 *
 * Installer set is scoped to Phase 1 lifecycle steps 6-8: pull jobs whose
 * installation details are ready (payment already confirmed by JEED/Remita),
 * and record the completed install. No VIEW_ALL, no MANAGE, no USERS,
 * no SETTINGS, no meter-type access.
 *
 * UPLOADS.EXCEL is now included after cross-checking against the real
 * Navigation.jsx: it explicitly lists Uploads as accessible to
 * `['admin', 'installer']`. This permission map previously excluded it,
 * which meant an installer would see "Uploads" in their nav, tap it, and
 * land on AccessDenied — a dead-end click. Navigation.jsx is real,
 * deliberately-built product code, so it's the source of truth here rather
 * than this file's earlier (explicitly flagged as unconfirmed) guess.
 */
const ROLE_PERMISSIONS = {
  [ROLES.INSTALLER]: [
    PERMISSIONS.DASHBOARD.VIEW_INSTALLER,
    PERMISSIONS.INSTALLATIONS.CREATE,
    PERMISSIONS.INSTALLATIONS.VIEW,
    PERMISSIONS.INSTALLATIONS.COMPLETE,
    PERMISSIONS.SCHEDULE.VIEW,
    PERMISSIONS.COMPLAINTS.CREATE,
    PERMISSIONS.UPLOADS.EXCEL,
  ],
};

/**
 * Page key -> required permission(s), matching the route names already
 * used in App.jsx. Empty array = any authenticated user. 'adminOnly' =
 * admin role required, no exceptions.
 */
const PAGE_PERMISSIONS = {
  dashboard: [],
  submit: [PERMISSIONS.INSTALLATIONS.CREATE],
  schedule: [PERMISSIONS.SCHEDULE.VIEW],
  users: 'adminOnly',
  uploads: [PERMISSIONS.UPLOADS.EXCEL],
  reports: 'adminOnly',
  settings: 'adminOnly',
  // Payment reconciliation & manual payment confirmation — deliberately
  // admin-only, same tier as reports/settings/users. Manually confirming
  // a payment is a consequential, money-adjacent action.
  payments: 'adminOnly',
  complaint: [PERMISSIONS.COMPLAINTS.CREATE],
};

const ROLE_METADATA = {
  [ROLES.ADMIN]: {
    displayName: 'Administrator',
    description: 'Full system access — users, meters, settings, and every installation across all installers',
    level: 100,
    color: 'indigo',
  },
  [ROLES.INSTALLER]: {
    displayName: 'Installer',
    description: 'Field installer — views assigned jobs and records completed installations',
    level: 10,
    color: 'blue',
  },
};

const normalizeRole = (role) => (role ? String(role).toLowerCase().trim() : null);

/**
 * Check a single permission. Admin always passes.
 */
export function hasPermission(role, permission) {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole || !permission) return false;
  if (normalizedRole === ROLES.ADMIN) return true;

  const rolePerms = ROLE_PERMISSIONS[normalizedRole] || [];
  return rolePerms.includes(permission);
}

/**
 * ALL given permissions must be granted (AND).
 */
export function hasPermissions(role, permissionsList = []) {
  if (!Array.isArray(permissionsList) || permissionsList.length === 0) return true;
  return permissionsList.every((permission) => hasPermission(role, permission));
}

/**
 * AT LEAST ONE given permission must be granted (OR).
 */
export function hasAnyPermission(role, permissionsList = []) {
  if (!Array.isArray(permissionsList) || permissionsList.length === 0) return true;
  return permissionsList.some((permission) => hasPermission(role, permission));
}

/**
 * Can this role access a given page key? Matches route names used in
 * App.jsx: 'dashboard', 'submit', 'schedule', 'users', 'uploads',
 * 'reports', 'settings', 'complaint'.
 */
export function canAccessPage(role, page) {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return false;
  if (normalizedRole === ROLES.ADMIN) return true;

  const required = PAGE_PERMISSIONS[page];
  if (required === undefined) {
    console.warn(`[permissions] Unknown page key: "${page}" — denying by default`);
    return false;
  }
  if (required === 'adminOnly') return false; // admin already handled above
  return hasAnyPermission(normalizedRole, required);
}

/**
 * All permissions granted to a role — admin gets the full catalog.
 */
export function getAllPermissionsForRole(role) {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return [];
  if (normalizedRole === ROLES.ADMIN) return ALL_PERMISSIONS;
  return ROLE_PERMISSIONS[normalizedRole] || [];
}

/**
 * Display metadata for a role (profile menus, badges, etc.)
 */
export function getRoleMetadata(role) {
  const normalizedRole = normalizeRole(role);
  return (
    ROLE_METADATA[normalizedRole] || {
      displayName: 'Unknown',
      description: 'No role assigned',
      level: 0,
      color: 'gray',
    }
  );
}

export function getPermissionDisplayName(permission) {
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
    [PERMISSIONS.COMPLAINTS.CREATE]: 'Create Complaints',
    [PERMISSIONS.COMPLAINTS.VIEW]: 'View Complaints',
    [PERMISSIONS.COMPLAINTS.MANAGE]: 'Manage Complaints',
    [PERMISSIONS.REPORTS.VIEW]: 'View Reports',
    [PERMISSIONS.REPORTS.EXPORT]: 'Export Reports',
    [PERMISSIONS.REPORTS.GENERATE]: 'Generate Reports',
    [PERMISSIONS.SCHEDULE.VIEW]: 'View Schedule',
    [PERMISSIONS.SCHEDULE.MANAGE]: 'Manage Schedule',
    [PERMISSIONS.SETTINGS.VIEW]: 'View Settings',
    [PERMISSIONS.SETTINGS.MANAGE]: 'Manage Settings',
    [PERMISSIONS.UPLOADS.EXCEL]: 'Upload Excel Files',
    [PERMISSIONS.UPLOADS.FILES]: 'Upload Files',
  };

  return names[permission] || permission;
}

export function clearPermissionCache() {
  return undefined;
}

export default {
  ROLES,
  PERMISSIONS,
  ALL_PERMISSIONS,
  hasPermission,
  hasPermissions,
  hasAnyPermission,
  canAccessPage,
  getAllPermissionsForRole,
  getRoleMetadata,
  getPermissionDisplayName,
  clearPermissionCache,
};