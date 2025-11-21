import { NextApiRequest, NextApiResponse } from 'next';
import { getRepositories } from '@/lib/repositories';
import { requireAuth } from '@/lib/auth-helpers';
import { ProjectRepository } from '@/lib/repositories/project.repository';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectId, columnId } = req.query;

  console.log('[DEBUG][COLUMN API] ===== REQUEST START =====');
  console.log('[DEBUG][COLUMN API] Method:', req.method);
  console.log('[DEBUG][COLUMN API] projectId:', projectId);
  console.log('[DEBUG][COLUMN API] columnId:', columnId);
  console.log('[DEBUG][COLUMN API] Body:', req.body);

  if (typeof projectId !== 'string' || typeof columnId !== 'string') {
    console.log('[DEBUG][COLUMN API] Invalid IDs');
    return res.status(400).json({ error: 'Invalid project ID or column ID' });
  }

  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['PATCH', 'DELETE']);
    console.log('[DEBUG][COLUMN API] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 인증 확인
    const session = await requireAuth(req, res);
    if (!session) {
      console.log('[DEBUG][COLUMN API] Auth failed');
      return;
    }

    console.log('[DEBUG][COLUMN API] Auth success for user:', session.user.id);

    // 프로젝트 멤버십 확인
    const projectRepo = new ProjectRepository();

    const project = projectRepo.findById(projectId);
    if (!project) {
      console.log('[DEBUG][COLUMN API] Project not found');
      return res.status(404).json({ error: 'Project not found' });
    }

    const isMember = projectRepo.isMember(projectId, session.user.id);
    console.log('[DEBUG][COLUMN API] Is member:', isMember);

    if (!isMember) {
      console.log('[DEBUG][COLUMN API] Access denied');
      return res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
    }

    const { boards } = getRepositories();

    // DELETE: 컬럼 삭제
    if (req.method === 'DELETE') {
      console.log('[DEBUG][COLUMN API] Deleting column');
      const deleted = await boards.deleteColumn(columnId);

      if (!deleted) {
        console.log('[DEBUG][COLUMN API] Delete failed');
        return res.status(400).json({ error: 'Failed to delete column' });
      }

      // 업데이트된 보드 반환
      const board = await boards.findByProjectId(projectId);
      console.log('[DEBUG][COLUMN API] Column deleted successfully');
      console.log('[DEBUG][COLUMN API] ===== REQUEST END =====');
      return res.status(200).json({ success: true, board });
    }

    // PATCH: 컬럼 업데이트
    const { wipLimit, title } = req.body;
    console.log('[DEBUG][COLUMN API] Update data - wipLimit:', wipLimit, 'title:', title);

    if (wipLimit === undefined && title === undefined) {
      console.log('[DEBUG][COLUMN API] No update data');
      return res.status(400).json({ error: 'No update data provided' });
    }

    const updateData: { wipLimit?: number; title?: string } = {};
    if (wipLimit !== undefined) updateData.wipLimit = wipLimit;
    if (title !== undefined) updateData.title = title;

    console.log('[DEBUG][COLUMN API] Calling boards.updateColumn with:', updateData);
    const success = await boards.updateColumn(columnId, updateData);
    console.log('[DEBUG][COLUMN API] Update result:', success);

    if (!success) {
      console.log('[DEBUG][COLUMN API] Update failed');
      return res.status(404).json({ error: 'Column not found or update failed' });
    }

    // 업데이트된 보드 반환
    const board = await boards.findByProjectId(projectId);
    console.log('[DEBUG][COLUMN API] Returning updated board');
    console.log('[DEBUG][COLUMN API] ===== REQUEST END =====');
    res.status(200).json({ success: true, board });
  } catch (error) {
    console.error('[DEBUG][COLUMN API] Error:', error);
    res.status(500).json({ error: 'Failed to update column' });
  }
}
