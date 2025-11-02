import { NextApiRequest, NextApiResponse } from 'next';
import { getRepositories } from '@/lib/repositories';
import { requireAuth } from '@/lib/auth-helpers';
import { ProjectRepository } from '@/lib/repositories/project.repository';
import { getDatabase } from '@/lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;

  console.log('[DEBUG][COLUMNS API] ===== REQUEST START =====');
  console.log('[DEBUG][COLUMNS API] Method:', req.method);
  console.log('[DEBUG][COLUMNS API] projectId:', projectId);

  if (typeof projectId !== 'string') {
    console.log('[DEBUG][COLUMNS API] Invalid project ID');
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    console.log('[DEBUG][COLUMNS API] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 인증 확인
    const session = await requireAuth(req, res);
    if (!session) {
      console.log('[DEBUG][COLUMNS API] Auth failed');
      return;
    }

    console.log('[DEBUG][COLUMNS API] Auth success for user:', session.user.id);

    // 프로젝트 멤버십 확인
    const db = getDatabase();
    const projectRepo = new ProjectRepository(db);

    const project = projectRepo.findById(projectId);
    if (!project) {
      console.log('[DEBUG][COLUMNS API] Project not found');
      return res.status(404).json({ error: 'Project not found' });
    }

    const isMember = projectRepo.isMember(projectId, session.user.id);
    console.log('[DEBUG][COLUMNS API] Is member:', isMember);

    if (!isMember) {
      console.log('[DEBUG][COLUMNS API] Access denied');
      return res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
    }

    const { boards } = getRepositories();

    // 보드 ID 가져오기
    const boardId = boards.getBoardIdByProjectId(projectId);
    if (!boardId) {
      console.log('[DEBUG][COLUMNS API] Board not found');
      return res.status(404).json({ error: 'Board not found for this project' });
    }

    // POST: 새 컬럼 생성
    const { title, wipLimit } = req.body;
    console.log('[DEBUG][COLUMNS API] Creating column - title:', title, 'wipLimit:', wipLimit);

    if (!title) {
      console.log('[DEBUG][COLUMNS API] Missing title');
      return res.status(400).json({ error: 'Column title is required' });
    }

    const column = boards.createColumn(boardId, {
      title,
      wipLimit: wipLimit ?? 5, // 기본값 5
    });

    console.log('[DEBUG][COLUMNS API] Column created:', column.id);

    // 업데이트된 보드 반환
    const board = boards.findByProjectId(projectId);
    console.log('[DEBUG][COLUMNS API] Returning updated board');
    console.log('[DEBUG][COLUMNS API] ===== REQUEST END =====');

    res.status(201).json({ success: true, column, board });
  } catch (error) {
    console.error('[DEBUG][COLUMNS API] Error:', error);
    res.status(500).json({ error: 'Failed to create column' });
  }
}
