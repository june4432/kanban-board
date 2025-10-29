import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { NextApiRequest, NextApiResponse } from 'next';
import { getRepositories } from './repositories';

/**
 * API 인증을 확인하고 세션을 반환합니다.
 * 인증되지 않은 경우 401 에러를 응답하고 null을 반환합니다.
 */
export async function requireAuth(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    res.status(401).json({ error: 'Unauthorized. Please sign in.' });
    return null;
  }

  return session;
}

/**
 * 프로젝트 멤버십을 확인합니다.
 * 인증되지 않았거나 프로젝트 멤버가 아닌 경우 에러를 응답하고 null을 반환합니다.
 */
export async function requireProjectMember(
  req: NextApiRequest,
  res: NextApiResponse,
  projectId: string
) {
  // 인증 확인
  const session = await requireAuth(req, res);
  if (!session) return null;

  const { projects } = getRepositories();

  // 프로젝트 조회
  const project = projects.findById(projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return null;
  }

  // 멤버십 확인 (소유자 또는 멤버)
  const userId = (session.user as any).id;
  const isMember =
    project.ownerId === userId || project.members.some((m) => m.id === userId);

  if (!isMember) {
    res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
    return null;
  }

  return { session, project, userId };
}

/**
 * 프로젝트 소유자 권한을 확인합니다.
 * 소유자가 아닌 경우 403 에러를 응답하고 null을 반환합니다.
 */
export async function requireProjectOwner(
  req: NextApiRequest,
  res: NextApiResponse,
  projectId: string
) {
  // 멤버십 확인
  const auth = await requireProjectMember(req, res, projectId);
  if (!auth) return null;

  const { project, userId } = auth;

  // 소유자 권한 확인
  if (project.ownerId !== userId) {
    res.status(403).json({ error: 'Access denied. Only the project owner can perform this action.' });
    return null;
  }

  return auth;
}

/**
 * 카드가 속한 프로젝트의 멤버십을 확인합니다.
 */
export async function requireCardAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  cardId: string
) {
  // 인증 확인
  const session = await requireAuth(req, res);
  if (!session) return null;

  const { cards, boards, projects } = getRepositories();

  // 카드 조회
  const card = cards.findById(cardId);
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return null;
  }

  // 카드가 속한 보드 찾기
  const board = boards.findByColumnId(card.columnId);
  if (!board) {
    res.status(404).json({ error: 'Board not found' });
    return null;
  }

  // 프로젝트 조회
  const project = projects.findById(board.projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return null;
  }

  // 멤버십 확인
  const userId = (session.user as any).id;
  const isMember =
    project.ownerId === userId || project.members.some((m) => m.id === userId);

  if (!isMember) {
    res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
    return null;
  }

  return { session, project, card, userId };
}
