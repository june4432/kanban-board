/**
 * Project Access Control Utility
 *
 * 프로젝트 접근 권한을 체크하는 유틸리티 함수들
 * - 직접 멤버십 (project_members)
 * - 그룹 기반 접근 (project_groups)
 * - 퍼블릭 프로젝트
 */

import { getRepositories } from '@/lib/repositories';
import { GroupRepository } from '@/lib/repositories/group.repository';

export type ProjectPermission = 'owner' | 'admin' | 'edit' | 'view' | 'none';

export interface ProjectAccessResult {
  hasAccess: boolean;
  permission: ProjectPermission;
  accessType: 'owner' | 'direct_member' | 'group' | 'public' | 'none';
  groupId?: string;       // 그룹 기반 접근인 경우
  groupName?: string;     // 그룹 기반 접근인 경우
}

/**
 * 사용자의 프로젝트 접근 권한을 확인합니다.
 *
 * 체크 순서:
 * 1. 프로젝트 소유자 여부
 * 2. 직접 멤버 여부 (project_members)
 * 3. 그룹 기반 접근 (project_groups + group_members)
 * 4. 퍼블릭 프로젝트 여부
 */
export async function checkProjectAccess(
  projectId: string,
  userId: string
): Promise<ProjectAccessResult> {
  const { projects } = getRepositories();
  const groupRepository = new GroupRepository();

  // 프로젝트 조회
  const project = await projects.findById(projectId);
  if (!project) {
    return {
      hasAccess: false,
      permission: 'none',
      accessType: 'none',
    };
  }

  // 1. 프로젝트 소유자 체크
  if (project.ownerId === userId) {
    return {
      hasAccess: true,
      permission: 'owner',
      accessType: 'owner',
    };
  }

  // 2. 직접 멤버 체크
  const directMember = project.members?.find(m => m.id === userId);
  if (directMember) {
    // project_members 테이블의 role을 가져와야 하지만,
    // 현재 구조에서는 members가 User[]로 변환되어 있음
    // project_members 테이블을 직접 조회
    const memberRole = await projects.getMemberRole(projectId, userId);

    return {
      hasAccess: true,
      permission: memberRole as ProjectPermission || 'view',
      accessType: 'direct_member',
    };
  }

  // 3. 그룹 기반 접근 체크
  const groupAccess = await groupRepository.getUserProjectPermission(userId, projectId);
  if (groupAccess) {
    return {
      hasAccess: true,
      permission: groupAccess.permission as ProjectPermission,
      accessType: 'group',
      groupId: groupAccess.groupId,
      groupName: groupAccess.groupName,
    };
  }

  // 4. 퍼블릭 프로젝트 체크
  if (project.isPublic) {
    return {
      hasAccess: true,
      permission: 'view',
      accessType: 'public',
    };
  }

  // 접근 권한 없음
  return {
    hasAccess: false,
    permission: 'none',
    accessType: 'none',
  };
}

/**
 * 특정 권한 이상을 가지고 있는지 확인합니다.
 */
export function hasMinimumPermission(
  current: ProjectPermission,
  required: ProjectPermission
): boolean {
  const permissionLevels: Record<ProjectPermission, number> = {
    'owner': 4,
    'admin': 3,
    'edit': 2,
    'view': 1,
    'none': 0,
  };

  return permissionLevels[current] >= permissionLevels[required];
}

/**
 * 사용자가 특정 권한 이상을 가지고 있는지 확인합니다.
 */
export async function requireProjectPermission(
  projectId: string,
  userId: string,
  requiredPermission: ProjectPermission
): Promise<{ allowed: boolean; accessResult: ProjectAccessResult }> {
  const accessResult = await checkProjectAccess(projectId, userId);

  const allowed = accessResult.hasAccess &&
    hasMinimumPermission(accessResult.permission, requiredPermission);

  return { allowed, accessResult };
}

/**
 * 사용자가 접근 가능한 프로젝트 ID 목록을 반환합니다.
 * (직접 멤버 + 그룹 기반 접근)
 */
export async function getAccessibleProjectIds(
  userId: string,
  _companyId?: string
): Promise<string[]> {
  const { projects } = getRepositories();
  const groupRepository = new GroupRepository();

  // 1. 직접 멤버인 프로젝트
  const directProjects = await projects.findByUserId(userId);
  const directProjectIds = directProjects.map(p => p.projectId);

  // 2. 그룹 기반 접근 가능한 프로젝트
  const groupProjectIds = await groupRepository.getAccessibleProjectIds(userId);

  // 3. 합치고 중복 제거
  const allProjectIds = [...new Set([...directProjectIds, ...groupProjectIds])];

  return allProjectIds;
}

/**
 * 프로젝트에 접근 가능한 사용자 목록을 반환합니다.
 * (직접 멤버 + 그룹 멤버)
 */
export async function getProjectAccessibleUsers(
  projectId: string
): Promise<Array<{
  userId: string;
  userName: string;
  userEmail: string;
  permission: ProjectPermission;
  accessType: 'owner' | 'direct_member' | 'group';
  groupName?: string;
}>> {
  const { projects } = getRepositories();
  const groupRepository = new GroupRepository();

  const project = await projects.findById(projectId);
  if (!project) return [];

  const users: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    permission: ProjectPermission;
    accessType: 'owner' | 'direct_member' | 'group';
    groupName?: string;
  }> = [];

  // 1. 소유자 추가
  const owner = project.members?.find(m => m.id === project.ownerId);
  if (owner) {
    users.push({
      userId: owner.id,
      userName: owner.name,
      userEmail: owner.email,
      permission: 'owner',
      accessType: 'owner',
    });
  }

  // 2. 직접 멤버 추가
  for (const member of project.members || []) {
    if (member.id === project.ownerId) continue; // 소유자는 이미 추가됨

    const memberRole = await projects.getMemberRole(projectId, member.id);
    users.push({
      userId: member.id,
      userName: member.name,
      userEmail: member.email,
      permission: memberRole as ProjectPermission || 'view',
      accessType: 'direct_member',
    });
  }

  // 3. 그룹 멤버 추가
  const groupUsers = await groupRepository.getProjectGroupMembers(projectId);
  for (const groupUser of groupUsers) {
    // 이미 직접 멤버인 경우 스킵
    if (users.some(u => u.userId === groupUser.userId)) continue;

    users.push({
      userId: groupUser.userId,
      userName: groupUser.userName,
      userEmail: groupUser.userEmail,
      permission: groupUser.permission as ProjectPermission,
      accessType: 'group',
      groupName: groupUser.groupName,
    });
  }

  return users;
}
