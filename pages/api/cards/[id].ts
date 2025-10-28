import { NextApiRequest, NextApiResponse } from 'next';
import { getRepositories } from '@/lib/repositories';
import { requireCardAccess } from '@/lib/auth-helpers';

// WebSocket server extension type
type NextApiResponseWithSocket = NextApiResponse & {
  socket?: {
    server?: any;
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid card ID' });
  }

  try {
    // 인증 및 카드 접근 권한 확인
    const auth = await requireCardAccess(req, res, id);
    if (!auth) return; // 이미 에러 응답이 전송됨

    const { session, project, userId } = auth;
    const userName = session.user?.name || 'Unknown User';

    const { cards } = getRepositories();

    switch (req.method) {
      case 'PUT':
        // 카드 업데이트
        const updates = req.body;

        // 카드 업데이트
        const updatedCard = cards.update(id, updates);

        if (!updatedCard) {
          return res.status(404).json({ error: 'Card not found' });
        }

        // 웹소켓 이벤트 전송 (프로젝트 멤버들에게만)
        if (res.socket?.server?.io) {
          const eventData = {
            card: updatedCard,
            user: { id: userId, name: userName },
            projectId: project.projectId,
            timestamp: Date.now(),
          };

          // 프로젝트 멤버들에게만 전송
          const memberUserIds = [
            project.ownerId,
            ...project.members.map((m) => m.id),
          ].filter((id, index, arr) => arr.indexOf(id) === index); // 중복 제거

          memberUserIds.forEach((memberId) => {
            res.socket!.server!.io.to(`user-${memberId}`).emit('card-updated', eventData);
          });

          console.log('Card updated event sent to project members:', memberUserIds);
        }

        res.status(200).json({ success: true });
        break;

      case 'DELETE':
        // 카드 삭제
        const deleted = cards.delete(id);

        if (!deleted) {
          return res.status(404).json({ error: 'Card not found' });
        }

        res.status(200).json({ success: true });
        break;

      default:
        res.setHeader('Allow', ['PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
