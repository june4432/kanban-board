/**
 * RBAC (Role-Based Access Control) Middleware
 * Fine-grained permission system for API v1
 */

import { NextApiResponse } from 'next';
import { ApiRequest, Permission, Role } from '../types';
import { sendForbidden, sendUnauthorized } from '../utils/response';
import { getRepositories } from '@/lib/repositories';

// ============================================================================
// Permission Definitions
// ============================================================================

/**
 * Role-to-Permission mapping
 * Defines what each role can do
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.VIEWER]: [
    Permission.ORG_READ,
    Permission.PROJECT_READ,
    Permission.CARD_READ,
  ],

  [Role.EDITOR]: [
    Permission.ORG_READ,
    Permission.PROJECT_READ,
    Permission.CARD_CREATE,
    Permission.CARD_READ,
    Permission.CARD_UPDATE,
    Permission.CARD_ASSIGN,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_UPDATE_OWN,
    Permission.COMMENT_DELETE_OWN,
  ],

  [Role.ADMIN]: [
    Permission.ORG_READ,
    Permission.ORG_UPDATE,
    Permission.ORG_MEMBERS_MANAGE,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.PROJECT_MEMBERS_MANAGE,
    Permission.CARD_CREATE,
    Permission.CARD_READ,
    Permission.CARD_UPDATE,
    Permission.CARD_DELETE,
    Permission.CARD_ASSIGN,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_UPDATE_ANY,
    Permission.COMMENT_DELETE_ANY,
  ],

  [Role.OWNER]: [
    // Owners have all permissions
    Permission.ORG_READ,
    Permission.ORG_UPDATE,
    Permission.ORG_DELETE,
    Permission.ORG_MEMBERS_MANAGE,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.PROJECT_MEMBERS_MANAGE,
    Permission.CARD_CREATE,
    Permission.CARD_READ,
    Permission.CARD_UPDATE,
    Permission.CARD_DELETE,
    Permission.CARD_ASSIGN,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_UPDATE_OWN,
    Permission.COMMENT_UPDATE_ANY,
    Permission.COMMENT_DELETE_OWN,
    Permission.COMMENT_DELETE_ANY,
  ],
};

// ============================================================================
// Permission Checking
// ============================================================================

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(permission);
}

/**
 * Check if user has permission in an organization
 */
export async function checkOrganizationPermission(
  userId: string,
  organizationId: string,
  permission: Permission
): Promise<boolean> {
  const { organizations } = getRepositories();

  // Check if user is member
  const isMember = organizations.isMember(organizationId, userId);
  if (!isMember) return false;

  // Get user role
  const userRole = organizations.getUserRole(organizationId, userId);
  if (!userRole) return false;

  // Check permission
  return roleHasPermission(userRole as Role, permission);
}

/**
 * Check if user has permission for a project
 * Checks both organization-level and project-level permissions
 */
export async function checkProjectPermission(
  userId: string,
  projectId: string,
  permission: Permission
): Promise<boolean> {
  const { projects, organizations } = getRepositories();

  const project = projects.findById(projectId);
  if (!project) return false;

  // Check if user is project owner
  if (project.ownerId === userId) return true;

  // Check if user is project member
  const isProjectMember = projects.isMember(projectId, userId);
  if (!isProjectMember) return false;

  // If project has organization, check organization permission
  const orgId = (project as any).organizationId;
  if (orgId) {
    const hasOrgPermission = await checkOrganizationPermission(userId, orgId, permission);
    if (hasOrgPermission) return true;
  }

  // Default: editors can do most operations, viewers can only read
  // This is a simplified model - can be enhanced later
  const projectBasedPermissions = [
    Permission.PROJECT_READ,
    Permission.CARD_CREATE,
    Permission.CARD_READ,
    Permission.CARD_UPDATE,
    Permission.COMMENT_CREATE,
  ];

  return projectBasedPermissions.includes(permission);
}

// ============================================================================
// Middleware Functions
// ============================================================================

/**
 * Require specific permission for organization
 */
export function requireOrganizationPermission(permission: Permission) {
  return async (
    req: ApiRequest,
    res: NextApiResponse,
    organizationId: string
  ): Promise<boolean> => {
    if (!req.user) {
      sendUnauthorized(res, 'Authentication required', req.requestId);
      return false;
    }

    const hasPermission = await checkOrganizationPermission(
      req.user.id,
      organizationId,
      permission
    );

    if (!hasPermission) {
      sendForbidden(
        res,
        `Permission denied: ${permission} required`,
        req.requestId
      );
      return false;
    }

    return true;
  };
}

/**
 * Require specific permission for project
 */
export function requireProjectPermission(permission: Permission) {
  return async (
    req: ApiRequest,
    res: NextApiResponse,
    projectId: string
  ): Promise<boolean> => {
    if (!req.user) {
      sendUnauthorized(res, 'Authentication required', req.requestId);
      return false;
    }

    const hasPermission = await checkProjectPermission(
      req.user.id,
      projectId,
      permission
    );

    if (!hasPermission) {
      sendForbidden(
        res,
        `Permission denied: ${permission} required`,
        req.requestId
      );
      return false;
    }

    return true;
  };
}

/**
 * Require minimum role in organization
 */
export function requireOrganizationRole(minimumRole: Role) {
  return async (
    req: ApiRequest,
    res: NextApiResponse,
    organizationId: string
  ): Promise<boolean> => {
    if (!req.user) {
      sendUnauthorized(res, 'Authentication required', req.requestId);
      return false;
    }

    const { organizations } = getRepositories();

    const userRole = organizations.getUserRole(organizationId, req.user.id);
    if (!userRole) {
      sendForbidden(
        res,
        'Access denied. You are not a member of this organization.',
        req.requestId
      );
      return false;
    }

    // Role hierarchy: viewer < editor < admin < owner
    const roleHierarchy: Record<Role, number> = {
      [Role.VIEWER]: 1,
      [Role.EDITOR]: 2,
      [Role.ADMIN]: 3,
      [Role.OWNER]: 4,
    };

    const userRoleLevel = roleHierarchy[userRole as Role] || 0;
    const requiredRoleLevel = roleHierarchy[minimumRole];

    if (userRoleLevel < requiredRoleLevel) {
      sendForbidden(
        res,
        `Access denied. Minimum role required: ${minimumRole}`,
        req.requestId
      );
      return false;
    }

    return true;
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get user's permissions in an organization
 */
export async function getUserOrganizationPermissions(
  userId: string,
  organizationId: string
): Promise<Permission[]> {
  const { organizations } = getRepositories();

  const userRole = organizations.getUserRole(organizationId, userId);
  if (!userRole) return [];

  return ROLE_PERMISSIONS[userRole as Role] || [];
}

/**
 * Get user's role in an organization
 */
export async function getUserOrganizationRole(
  userId: string,
  organizationId: string
): Promise<Role | null> {
  const { organizations } = getRepositories();

  const userRole = organizations.getUserRole(organizationId, userId);
  return userRole as Role | null;
}

/**
 * Check if user can perform action on resource owned by another user
 * (e.g., edit someone else's comment)
 */
export async function canModifyOtherUsersResource(
  userId: string,
  organizationId: string,
  resourceOwnerId: string
): Promise<boolean> {
  // Own resources can always be modified
  if (userId === resourceOwnerId) return true;

  // Admin and owner can modify others' resources
  const userRole = await getUserOrganizationRole(userId, organizationId);
  return userRole === Role.ADMIN || userRole === Role.OWNER;
}
