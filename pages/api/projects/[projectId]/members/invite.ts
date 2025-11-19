import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';
import { getDatabase } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/projects/:projectId/members/invite
 * 사용자를 프로젝트 멤버로 직접 추가
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { projectId } = req.query;
  if (typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  const { userId } = req.body;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const db = getDatabase();

    // 프로젝트 소유자 확인
    const project = db.prepare('SELECT owner_id FROM projects WHERE project_id = ?').get(projectId) as { owner_id: string } | undefined;
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.owner_id !== session.user.id) {
      return res.status(403).json({ error: 'Only project owner can invite members' });
    }

    // 초대할 사용자 확인
    const userToInvite = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(userId) as { id: string; email: string; name: string } | undefined;
    if (!userToInvite) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 이미 멤버인지 확인
    const existingMember = db.prepare(`
      SELECT id FROM project_members WHERE project_id = ? AND user_id = ?
    `).get(projectId, userId);

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this project' });
    }

    // 멤버로 추가
    const memberId = uuidv4();
    db.prepare(`
      INSERT INTO project_members (id, project_id, user_id, role, joined_at)
      VALUES (?, ?, ?, 'member', CURRENT_TIMESTAMP)
    `).run(memberId, projectId, userId);

    // 추가된 멤버 정보 조회
    const newMember = db.prepare(`
      SELECT
        pm.id,
        pm.user_id,
        pm.role,
        pm.joined_at,
        u.email,
        u.name,
        u.avatar
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.id = ?
    `).get(memberId);

    return res.status(201).json({
      message: 'User invited successfully',
      member: newMember
    });
  } catch (error) {
    console.error('Error inviting user:', error);
    return res.status(500).json({ error: 'Failed to invite user' });
  }
}
