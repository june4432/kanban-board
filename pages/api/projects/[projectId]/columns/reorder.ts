import { NextApiRequest, NextApiResponse } from 'next';
import { getRepositories } from '@/lib/repositories';
import { requireAuth } from '@/lib/auth-helpers';
import { ProjectRepository } from '@/lib/repositories/project.repository';
import { getDatabase } from '@/lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;

  if (typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 인증 확인
    const session = await requireAuth(req, res);
    if (!session) return;

    // 프로젝트 멤버십 확인
    const db = getDatabase();
    const projectRepo = new ProjectRepository(db);

    const project = projectRepo.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const isMember = projectRepo.isMember(projectId, session.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
    }

    const { boards } = getRepositories();

    // PUT: 컬럼 순서 변경
    const { columnUpdates } = req.body;

    if (!Array.isArray(columnUpdates)) {
      return res.status(400).json({ error: 'columnUpdates must be an array' });
    }

    const success = boards.reorderColumns(columnUpdates);

    if (!success) {
      return res.status(500).json({ error: 'Failed to reorder columns' });
    }

    // 업데이트된 보드 반환
    const board = boards.findByProjectId(projectId);

    res.status(200).json({ success: true, board });
  } catch (error) {
    console.error('[REORDER COLUMNS API] Error:', error);
    res.status(500).json({ error: 'Failed to reorder columns' });
  }
}
