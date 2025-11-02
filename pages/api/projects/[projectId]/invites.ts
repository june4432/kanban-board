import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { getDatabase } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { projectId } = req.query;
  if (typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
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
    case 'POST':
      return handleCreateInvite(req, res, db, projectId, session.user.id);
    case 'GET':
      return handleListInvites(req, res, db, projectId);
    default:
      res.setHeader('Allow', ['POST', 'GET']);
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// 초대 링크 생성
function handleCreateInvite(
  req: NextApiRequest,
  res: NextApiResponse,
  db: any,
  projectId: string,
  userId: string
) {
  const { expiresIn, maxUses } = req.body;

  const id = uuidv4();
  const inviteToken = uuidv4();
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

  try {
    db.prepare(`
      INSERT INTO project_invitations (id, project_id, invite_token, created_by, expires_at, max_uses)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, projectId, inviteToken, userId, expiresAt, maxUses || null);

    const invitation = db.prepare(`
      SELECT * FROM project_invitations WHERE id = ?
    `).get(id);

    return res.status(201).json({
      invitation,
      inviteUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invite/${inviteToken}`
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return res.status(500).json({ error: 'Failed to create invitation' });
  }
}

// 초대 링크 목록 조회
function handleListInvites(
  req: NextApiRequest,
  res: NextApiResponse,
  db: any,
  projectId: string
) {
  try {
    const invitations = db.prepare(`
      SELECT
        i.*,
        u.name as created_by_name
      FROM project_invitations i
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.project_id = ?
      AND i.is_active = 1
      ORDER BY i.created_at DESC
    `).all(projectId);

    return res.status(200).json({ invitations });
  } catch (error) {
    console.error('Error listing invitations:', error);
    return res.status(500).json({ error: 'Failed to list invitations' });
  }
}
