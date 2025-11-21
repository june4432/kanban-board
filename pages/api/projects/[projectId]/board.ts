import { NextApiRequest, NextApiResponse } from 'next';
import { getRepositories } from '@/lib/repositories';
import { requireAuth } from '@/lib/auth-helpers';
import { ProjectRepository } from '@/lib/repositories/project.repository';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;

  console.log('[DEBUG][BOARD API] Request received for projectId:', projectId);

  if (typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 인증 확인
    const session = await requireAuth(req, res);
    if (!session) {
      console.log('[DEBUG][BOARD API] Auth failed');
      return; // 이미 에러 응답 전송됨
    }

    console.log('[DEBUG][BOARD API] Auth success for user:', session.user.id);

    // 프로젝트 멤버십 확인
    const projectRepo = new ProjectRepository();

    const project = projectRepo.findById(projectId);
    if (!project) {
      console.log('[DEBUG][BOARD API] Project not found');
      return res.status(404).json({ error: 'Project not found' });
    }

    const isMember = projectRepo.isMember(projectId, session.user.id);
    console.log('[DEBUG][BOARD API] Is member:', isMember);

    if (!isMember) {
      console.log('[DEBUG][BOARD API] Access denied - not a member');
      return res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
    }

    const { boards } = getRepositories();
    const board = await boards.findByProjectId(projectId);

    if (!board) {
      console.log('[DEBUG][BOARD API] Board not found');
      return res.status(404).json({ error: 'Board not found' });
    }

    console.log('[DEBUG][BOARD API] Returning board with', board.columns?.length || 0, 'columns');
    res.status(200).json({ board });
  } catch (error) {
    console.error('[DEBUG][BOARD API] Error fetching board:', error);
    res.status(500).json({ error: 'Failed to fetch board' });
  }
}
