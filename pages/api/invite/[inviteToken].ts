import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { queryOne, query } from '@/lib/postgres';
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

  switch (req.method) {
    case 'GET':
      return handleGetInviteInfo(res, inviteToken);
    case 'POST':
      return handleJoinProject(req, res, inviteToken);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// 초대 링크 정보 조회 (로그인 필요 없음)
async function handleGetInviteInfo(
  res: NextApiResponse,
  inviteToken: string
) {
  try {
    const invitation = await queryOne<{
      project_name: string;
      project_description: string;
      project_color: string;
      invited_by_name: string;
      expires_at: string;
      status: string;
    }>(`
      SELECT
        i.*,
        p.name as project_name,
        p.description as project_description,
        p.color as project_color,
        u.name as invited_by_name
      FROM invitations i
      JOIN projects p ON i.project_id = p.id
      JOIN users u ON i.invited_by = u.id
      WHERE i.token = $1
      AND i.status = 'pending'
    `, [inviteToken]);

    if (!invitation) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }

    // 만료 시간 확인
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Invitation has expired' });
    }

    return res.status(200).json({
      projectName: invitation.project_name,
      projectDescription: invitation.project_description,
      projectColor: invitation.project_color,
      invitedBy: invitation.invited_by_name,
      expiresAt: invitation.expires_at,
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
  inviteToken: string
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Must be logged in to join project' });
  }

  try {
    const invitation = await queryOne<{
      id: string;
      project_id: string;
      expires_at: string;
      status: string;
    }>(`
      SELECT * FROM invitations
      WHERE token = $1
      AND status = 'pending'
    `, [inviteToken]);

    if (!invitation) {
      return res.status(404).json({ error: 'Invalid or inactive invitation' });
    }

    // 만료 시간 확인
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Invitation has expired' });
    }

    // 이미 멤버인지 확인
    const existingMember = await queryOne(`
      SELECT project_id FROM project_members
      WHERE project_id = $1 AND user_id = $2
    `, [invitation.project_id, (session.user as any).id]);

    if (existingMember) {
      return res.status(400).json({ error: 'Already a member of this project' });
    }

    // 프로젝트에 멤버로 추가
    await query(`
      INSERT INTO project_members (project_id, user_id, role, joined_at)
      VALUES ($1, $2, 'member', NOW())
    `, [invitation.project_id, (session.user as any).id]);

    // 초대 상태 업데이트
    await query(`
      UPDATE invitations
      SET status = 'accepted', accepted_at = NOW()
      WHERE id = $1
    `, [invitation.id]);

    // 프로젝트 정보 조회
    const project = await queryOne(`
      SELECT * FROM projects WHERE id = $1
    `, [invitation.project_id]);

    const newMemberName = session.user.name || session.user.email || '알 수 없는 사용자';

    // 웹소켓 이벤트 전송 (프로젝트 멤버들에게 알림)
    const socketRes = res as NextApiResponseWithSocket;
    if (socketRes.socket?.server?.io) {
      const { projects } = getRepositories();
      const projectData = await projects.findById(invitation.project_id);

      if (projectData) {
        const eventData = {
          projectId: invitation.project_id,
          projectName: projectData.name,
          newMember: {
            id: (session.user as any).id,
            name: newMemberName,
            email: session.user.email
          },
          timestamp: Date.now(),
        };

        // 프로젝트 멤버들의 사용자 ID 목록 수집 (새로 참여한 사람 제외)
        const memberUserIds = [
          projectData.ownerId, // 프로젝트 소유자
          ...projectData.members.map((member) => member.id), // 기존 멤버들
        ].filter(id => id !== (session.user as any)?.id); // 본인은 제외

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
