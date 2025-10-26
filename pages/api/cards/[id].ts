import { NextApiRequest, NextApiResponse } from 'next';
import { getRepositories } from '@/lib/repositories';

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
    // projectId를 query 또는 body에서 가져옴
    const projectId = (req.query.projectId as string) || req.body.projectId;
    const { userId, userName } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

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
            user: { id: userId || 'unknown', name: userName || '알 수 없는 사용자' },
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
