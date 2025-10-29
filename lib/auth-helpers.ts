import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { ProjectRepository } from './repositories/project.repository';
import { getDatabase } from './database';

export interface AuthSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

/**
 * API 라우트에서 사용자 인증을 확인합니다.
 * 인증되지 않은 경우 401 에러를 반환합니다.
 */
export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthSession | null> {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    res.status(401).json({ error: 'Unauthorized. Please login first.' });
    return null;
  }

  return session as AuthSession;
}

/**
 * 프로젝트 멤버십을 확인합니다.
 * 사용자가 프로젝트 멤버가 아닌 경우 403 에러를 반환합니다.
 */
export async function requireProjectMember(
  req: NextApiRequest,
  res: NextApiResponse,
  projectId: string
): Promise<{ session: AuthSession; isOwner: boolean } | null> {
  const session = await requireAuth(req, res);
  if (!session) return null;

  const db = getDatabase();
  const projectRepo = new ProjectRepository(db);

  const project = projectRepo.findById(projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return null;
  }

  const isMember = projectRepo.isMember(projectId, session.user.id);
  if (!isMember) {
    res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
    return null;
  }

  const isOwner = project.ownerId === session.user.id;

  return { session, isOwner };
}

/**
 * 프로젝트 소유자 권한을 확인합니다.
 * 소유자가 아닌 경우 403 에러를 반환합니다.
 */
export async function requireProjectOwner(
  req: NextApiRequest,
  res: NextApiResponse,
  projectId: string
): Promise<AuthSession | null> {
  const result = await requireProjectMember(req, res, projectId);
  if (!result) return null;

  if (!result.isOwner) {
    res.status(403).json({ error: 'Access denied. Only project owner can perform this action.' });
    return null;
  }

  return result.session;
}

/**
 * 카드 접근 권한을 확인합니다.
 * 카드가 속한 프로젝트의 멤버인지 확인합니다.
 */
export async function requireCardAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  cardId: string
): Promise<{ session: AuthSession; projectId: string } | null> {
  const session = await requireAuth(req, res);
  if (!session) return null;

  const db = getDatabase();

  // 카드가 속한 프로젝트 ID 조회
  const query = `
    SELECT b.project_id
    FROM cards c
    JOIN columns col ON c.column_id = col.id
    JOIN boards b ON col.board_id = b.board_id
    WHERE c.id = ?
  `;

  const result = db.prepare(query).get(cardId) as { project_id: string } | undefined;

  if (!result) {
    res.status(404).json({ error: 'Card not found' });
    return null;
  }

  const projectId = result.project_id;
  const projectRepo = new ProjectRepository(db);

  const isMember = projectRepo.isMember(projectId, session.user.id);
  if (!isMember) {
    res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
    return null;
  }

  return { session, projectId };
}
