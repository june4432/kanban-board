import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getDatabase } from '@/lib/database';
import { getRepositories } from '@/lib/repositories';

// WebSocket server extension type
type NextApiResponseWithSocket = NextApiResponse & {
  socket?: {
    server?: any;
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  const { inviteToken } = req.query;

  if (typeof inviteToken !== 'string') {
    return res.status(400).json({ error: 'Invalid invite token' });
  }

  const db = getDatabase();

  switch (req.method) {
    case 'GET':
      return handleGetInviteInfo(req, res, db, inviteToken);
    case 'POST':
      return handleJoinProject(req, res, db, inviteToken);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// 초대 링크 정보 조회 (로그인 필요 없음)
function handleGetInviteInfo(
  req: NextApiRequest,
  res: NextApiResponse,
  db: any,
  inviteToken: string
) {
  try {
    const invitation = db.prepare(`
      SELECT
        i.*,
        p.name as project_name,
        p.description as project_description,
        p.color as project_color,
        u.name as invited_by_name
      FROM project_invitations i
      JOIN projects p ON i.project_id = p.project_id
      JOIN users u ON i.created_by = u.id
      WHERE i.invite_token = ?
      AND i.is_active = 1
    `).get(inviteToken);

    if (!invitation) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }

    // 만료 시간 확인
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Invitation has expired' });
    }

    // 사용 횟수 확인
    if (invitation.max_uses && invitation.current_uses >= invitation.max_uses) {
      return res.status(410).json({ error: 'Invitation has reached maximum uses' });
    }

    return res.status(200).json({
      projectName: invitation.project_name,
      projectDescription: invitation.project_description,
      projectColor: invitation.project_color,
      invitedBy: invitation.invited_by_name,
      expiresAt: invitation.expires_at,
      usesRemaining: invitation.max_uses
        ? invitation.max_uses - invitation.current_uses
        : null
    });
  } catch (error) {
    console.error('Error getting invitation info:', error);
    return res.status(500).json({ error: 'Failed to get invitation information' });
  }
}

// 초대 링크로 프로젝트 참여
async function handleJoinProject(
  req: NextApiRequest,
  res: NextApiResponseWithSocket,
  db: any,
  inviteToken: string
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Must be logged in to join project' });
  }

  try {
    const invitation = db.prepare(`
      SELECT * FROM project_invitations
      WHERE invite_token = ?
      AND is_active = 1
    `).get(inviteToken);

    if (!invitation) {
      return res.status(404).json({ error: 'Invalid or inactive invitation' });
    }

    // 만료 시간 확인
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Invitation has expired' });
    }

    // 사용 횟수 확인
    if (invitation.max_uses && invitation.current_uses >= invitation.max_uses) {
      return res.status(410).json({ error: 'Invitation has reached maximum uses' });
    }

    // 이미 멤버인지 확인
    const existingMember = db.prepare(`
      SELECT * FROM project_members
      WHERE project_id = ? AND user_id = ?
    `).get(invitation.project_id, session.user.id);

    if (existingMember) {
      return res.status(400).json({ error: 'Already a member of this project' });
    }

    // 프로젝트에 멤버로 추가
    db.prepare(`
      INSERT INTO project_members (project_id, user_id, role)
      VALUES (?, ?, 'member')
    `).run(invitation.project_id, session.user.id);

    // 사용 횟수 증가
    db.prepare(`
      UPDATE project_invitations
      SET current_uses = current_uses + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(invitation.id);

    // 프로젝트 정보 조회
    const project = db.prepare(`
      SELECT * FROM projects WHERE project_id = ?
    `).get(invitation.project_id);

    const newMemberName = session.user.name || session.user.email || '알 수 없는 사용자';

    // 웹소켓 이벤트 전송 (프로젝트 멤버들에게 알림)
    const socketRes = res as NextApiResponseWithSocket;
    if (socketRes.socket?.server?.io) {
      const { projects } = getRepositories();
      const projectData = projects.findById(invitation.project_id);

      if (projectData) {
        const eventData = {
          projectId: invitation.project_id,
          projectName: projectData.name,
          newMember: {
            id: session.user.id,
            name: newMemberName,
            email: session.user.email
          },
          timestamp: Date.now(),
        };

        // 프로젝트 멤버들의 사용자 ID 목록 수집 (새로 참여한 사람 제외)
        const memberUserIds = [
          projectData.ownerId, // 프로젝트 소유자
          ...projectData.members.map((member) => member.id), // 기존 멤버들
        ].filter(id => id !== session.user.id); // 본인은 제외

        // 프로젝트 멤버들에게 이벤트 전송
        memberUserIds.forEach((memberId) => {
          socketRes.socket!.server!.io.to(`user-${memberId}`).emit('member-joined', eventData);
        });

        console.log('Member joined event sent to project members:', memberUserIds);

        // Slack 알림 전송 (비동기, 실패해도 참여는 성공)
        if (projectData.slackEnabled && projectData.slackWebhookUrl) {
          fetch(`${req.headers.origin || 'http://localhost:3000'}/api/slack/notify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': req.headers.cookie || '',
            },
            body: JSON.stringify({
              projectId: invitation.project_id,
              event: 'member_joined',
              memberName: newMemberName,
              projectName: projectData.name,
            }),
          }).catch((error) => {
            console.error('Failed to send Slack notification:', error);
          });
        }
      }
    }

    return res.status(200).json({
      message: 'Successfully joined project',
      project
    });
  } catch (error) {
    console.error('Error joining project:', error);
    return res.status(500).json({ error: 'Failed to join project' });
  }
}
