import { NextApiResponse } from 'next';
import { ApiRequest, Permission, Role } from '../types';
import { sendUnauthorized, sendForbidden } from '../utils/response';
import {
  checkProjectAccess,
  ProjectPermission,
  hasMinimumPermission,
} from '../utils/project-access';

// Role definitions mapping roles to permissions
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
    // Owner has all permissions
    ...Object.values(Permission),
  ],
};

// Map Permission to required ProjectPermission level
const PERMISSION_TO_PROJECT_LEVEL: Record<Permission, ProjectPermission> = {
  [Permission.ORG_READ]: 'view',
  [Permission.ORG_UPDATE]: 'admin',
  [Permission.ORG_DELETE]: 'owner',
  [Permission.ORG_MEMBERS_MANAGE]: 'admin',
  [Permission.PROJECT_CREATE]: 'admin',
  [Permission.PROJECT_READ]: 'view',
  [Permission.PROJECT_UPDATE]: 'admin',
  [Permission.PROJECT_DELETE]: 'owner',
  [Permission.PROJECT_MEMBERS_MANAGE]: 'owner',
  [Permission.CARD_CREATE]: 'edit',
  [Permission.CARD_READ]: 'view',
  [Permission.CARD_UPDATE]: 'edit',
  [Permission.CARD_DELETE]: 'admin',
  [Permission.CARD_ASSIGN]: 'edit',
  [Permission.COMMENT_CREATE]: 'view',
  [Permission.COMMENT_UPDATE_OWN]: 'view',
  [Permission.COMMENT_DELETE_OWN]: 'view',
  [Permission.COMMENT_UPDATE_ANY]: 'admin',
  [Permission.COMMENT_DELETE_ANY]: 'admin',
};

/**
 * Middleware to require a specific permission for accessing a project resource.
 * Checks both direct membership and group-based access.
 */
export function requirePermission(permission: Permission) {
  return async (req: ApiRequest, res: NextApiResponse, next: () => Promise<void> | void) => {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required', req.requestId);
    }

    // Extract projectId from various sources
    const projectId = extractProjectId(req);

    if (projectId) {
      // Check project-level access
      const accessResult = await checkProjectAccess(projectId, req.user.id);

      if (!accessResult.hasAccess) {
        return sendForbidden(
          res,
          'You do not have access to this project',
          req.requestId
        );
      }

      // Check if user has required permission level
      const requiredLevel = PERMISSION_TO_PROJECT_LEVEL[permission] || 'view';
      if (!hasMinimumPermission(accessResult.permission, requiredLevel)) {
        return sendForbidden(
          res,
          `Permission denied: ${permission} requires ${requiredLevel} access or higher`,
          req.requestId
        );
      }

      // Attach access result to request for use in handlers
      req.projectAccess = accessResult;
    }

    await next();
  };
}

/**
 * Middleware to require project access with a minimum permission level.
 * More explicit alternative to requirePermission.
 */
export function requireProjectAccess(minPermission: ProjectPermission = 'view') {
  return async (req: ApiRequest, res: NextApiResponse, next: () => Promise<void> | void) => {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required', req.requestId);
    }

    const projectId = extractProjectId(req);

    if (!projectId) {
      return sendForbidden(res, 'Project ID is required', req.requestId);
    }

    const accessResult = await checkProjectAccess(projectId, req.user.id);

    if (!accessResult.hasAccess) {
      return sendForbidden(
        res,
        'You do not have access to this project',
        req.requestId
      );
    }

    if (!hasMinimumPermission(accessResult.permission, minPermission)) {
      return sendForbidden(
        res,
        `This action requires ${minPermission} permission or higher`,
        req.requestId
      );
    }

    // Attach access result to request
    req.projectAccess = accessResult;

    await next();
  };
}

/**
 * Extract project ID from request (query params, body, or path)
 */
function extractProjectId(req: ApiRequest): string | null {
  // From query params (e.g., /api/v1/projects/[id])
  if (req.query.id && typeof req.query.id === 'string') {
    return req.query.id;
  }

  // From query params (projectId variant)
  if (req.query.projectId && typeof req.query.projectId === 'string') {
    return req.query.projectId;
  }

  // From request body
  if (req.body?.projectId && typeof req.body.projectId === 'string') {
    return req.body.projectId;
  }

  return null;
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Convert ProjectPermission to Role for compatibility
 */
export function projectPermissionToRole(permission: ProjectPermission): Role {
  switch (permission) {
    case 'owner':
      return Role.OWNER;
    case 'admin':
      return Role.ADMIN;
    case 'edit':
      return Role.EDITOR;
    case 'view':
    default:
      return Role.VIEWER;
  }
}
