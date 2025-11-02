import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';
import { getDatabase } from '@/lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { projectId, inviteId } = req.query;
  if (typeof projectId !== 'string' || typeof inviteId !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  const db = getDatabase();

  // 프로젝트 소유자 확인
  const project = db.prepare('SELECT owner_id FROM projects WHERE project_id = ?').get(projectId) as { owner_id: string } | undefined;
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (project.owner_id !== session.user.id) {
    return res.status(403).json({ error: 'Only project owner can manage invitations' });
  }

  switch (req.method) {
    case 'DELETE':
      return handleDeleteInvite(req, res, db, projectId, inviteId);
    default:
      res.setHeader('Allow', ['DELETE']);
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// 초대 링크 삭제 (비활성화)
function handleDeleteInvite(
  req: NextApiRequest,
  res: NextApiResponse,
  db: any,
  projectId: string,
  inviteId: string
) {
  try {
    // 초대 링크가 해당 프로젝트의 것인지 확인
    const invitation = db.prepare(`
      SELECT * FROM project_invitations
      WHERE id = ? AND project_id = ?
    `).get(inviteId, projectId);

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // 비활성화
    db.prepare(`
      UPDATE project_invitations
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(inviteId);

    return res.status(200).json({ message: 'Invitation deactivated successfully' });
  } catch (error) {
    console.error('Error deleting invitation:', error);
    return res.status(500).json({ error: 'Failed to delete invitation' });
  }
}
