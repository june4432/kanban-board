import { NextApiResponse } from 'next';
import { ApiRequest, Permission, Role } from '../types';
import { sendForbidden, sendUnauthorized } from '../utils/response';
import { getRepositories } from '@/lib/repositories';

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

export function requirePermission(permission: Permission) {
  return async (req: ApiRequest, res: NextApiResponse, next: () => Promise<void> | void) => {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required', req.requestId);
    }

    // 1. Check Organization Level Permissions
    const orgId = req.query.organizationId as string || req.body.organizationId;
    if (orgId) {
      const { organizations } = getRepositories();
      const member = await organizations.findMember(orgId, req.user.id);

      if (!member) {
        return sendForbidden(res, 'You are not a member of this organization', req.requestId);
      }

      // Check if user's role has the required permission
      const userPermissions = ROLE_PERMISSIONS[member.role as Role] || [];
      if (!userPermissions.includes(permission)) {
        return sendForbidden(res, `Permission denied: ${permission} required`, req.requestId);
      }
    }

    // 2. Check Project Level Permissions (if applicable)
    // Note: This is a simplified check. In a real system, project roles might override org roles.
    // For now, we assume org roles propagate to projects.

    await next();
  };
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}
