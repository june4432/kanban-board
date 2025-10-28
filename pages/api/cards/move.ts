import { NextApiRequest, NextApiResponse } from 'next';
import { getRepositories } from '@/lib/repositories';
import { requireProjectMember } from '@/lib/auth-helpers';

// WebSocket server extension type
type NextApiResponseWithSocket = NextApiResponse & {
  socket?: {
    server?: any;
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  console.log('🚀 [API] Card move API called');
  console.log('🚀 [API] Method:', req.method);

  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const {
      cardId,
      sourceColumnId,
      destinationColumnId,
      destinationIndex,
      projectId,
    } = req.body;

    if (!cardId || !sourceColumnId || !destinationColumnId || destinationIndex === undefined) {
      return res.status(400).json({
        error: 'Card ID, source column ID, destination column ID, and destination index are required',
      });
    }

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // 인증 및 프로젝트 멤버십 확인
    const auth = await requireProjectMember(req, res, projectId);
    if (!auth) return; // 이미 에러 응답이 전송됨

    const { session, project, userId } = auth;
    const userName = session.user?.name || 'Unknown User';

    const { cards } = getRepositories();

    // 카드 이동
    const success = cards.moveCard(cardId, destinationColumnId, destinationIndex);

    if (!success) {
      return res.status(400).json({ error: 'Failed to move card. WIP limit may have been reached.' });
    }

    // 웹소켓 이벤트 전송 (프로젝트 멤버들에게만)
    console.log('📤 [API] Attempting to send WebSocket event');
    console.log('📤 [API] Socket server exists:', !!res.socket?.server?.io);

    if (res.socket?.server?.io) {
      // 업데이트된 카드 가져오기
      const updatedCard = cards.findById(cardId);

      const eventData = {
        card: updatedCard,
        user: { id: userId, name: userName },
        fromColumn: sourceColumnId,
        toColumn: destinationColumnId,
        destinationIndex: destinationIndex,
        projectId: project.projectId,
        timestamp: Date.now(),
      };

      console.log('📤 [API] Event data:', eventData);

      // 프로젝트 멤버들의 사용자 ID 목록 수집
      const memberUserIds = [
        project.ownerId,
        ...project.members.map((member) => member.id),
      ].filter((id, index, arr) => arr.indexOf(id) === index); // 중복 제거

      console.log('📤 [API] Sending to project members:', memberUserIds);

      // 프로젝트 멤버들에게만 이벤트 전송
      memberUserIds.forEach((memberId) => {
        console.log(`📤 [API] Sending card-moved event to user-${memberId}`);
        res.socket!.server!.io.to(`user-${memberId}`).emit('card-moved', eventData);
      });

      console.log('📤 [API] Card moved event sent to project members only:', memberUserIds);
    } else {
      console.log('❌ [API] No WebSocket server available');
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
