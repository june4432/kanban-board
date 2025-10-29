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

  // 인증 및 카드 접근 권한 확인
  const auth = await requireCardAccess(req, res, id);
  if (!auth) return; // 이미 에러 응답 전송됨

  const { session, projectId } = auth;

  try {
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

        // 웹소켓 이벤트 전송
        if (res.socket?.server?.io) {
          const eventData = {
            card: updatedCard,
            user: { id: session.user.id, name: session.user.name || '알 수 없는 사용자' },
            projectId: projectId,
            timestamp: Date.now(),
          };
          res.socket.server.io.emit('card-updated', eventData);
          console.log('Card updated event broadcasted to all users:', projectId);
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
