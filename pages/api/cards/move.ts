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
  console.log('🚀 [API] Card move API called');
  console.log('🚀 [API] Method:', req.method);
  console.log('🚀 [API] Request body:', req.body);

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
    } = req.body;

    if (!cardId || !sourceColumnId || !destinationColumnId || destinationIndex === undefined) {
      return res.status(400).json({
        error: 'Card ID, source column ID, destination column ID, and destination index are required',
      });
    }

    // 인증 및 카드 접근 권한 확인
    const auth = await requireCardAccess(req, res, cardId);
    if (!auth) return; // 이미 에러 응답 전송됨

    const { session, projectId } = auth;

    const { cards, projects, boards } = getRepositories();

    // 카드 이동
    const success = await cards.moveCard(cardId, destinationColumnId, destinationIndex);

    if (!success) {
      return res.status(400).json({ error: 'Failed to move card. WIP limit may have been reached.' });
    }

    // 웹소켓 이벤트 전송 (프로젝트 멤버들에게만)
    const socketRes = res as NextApiResponseWithSocket;
    console.log('📤 [API] Attempting to send WebSocket event');
    console.log('📤 [API] Socket server exists:', !!socketRes.socket?.server?.io);
    console.log('📤 [API] Project ID:', projectId);
    console.log('📤 [API] User ID:', session.user.id);
    console.log('📤 [API] User Name:', session.user.name);

    if (socketRes.socket?.server?.io) {
      // 프로젝트 정보 가져오기
      const project = await projects.findById(projectId);
      if (project) {
        // 업데이트된 카드 가져오기
        const updatedCard = await cards.findById(cardId);

        const eventData = {
          card: updatedCard,
          user: { id: session.user.id, name: session.user.name || '알 수 없는 사용자' },
          fromColumn: sourceColumnId,
          toColumn: destinationColumnId,
          destinationIndex: destinationIndex,
          projectId: projectId,
          timestamp: Date.now(),
        };

        console.log('📤 [API] Event data:', eventData);

        // 프로젝트 멤버들의 사용자 ID 목록 수집
        const memberUserIds = [
          project.ownerId, // 프로젝트 소유자
          ...project.members.map((member) => member.id), // 멤버들
        ].filter((id, index, arr) => arr.indexOf(id) === index); // 중복 제거

        console.log('📤 [API] Sending to project members:', memberUserIds);

        // 프로젝트 멤버들에게만 이벤트 전송
        memberUserIds.forEach((memberId) => {
          console.log(`📤 [API] Sending card-moved event to user-${memberId}`);
          socketRes.socket!.server!.io.to(`user-${memberId}`).emit('card-moved', eventData);
        });

        console.log('📤 [API] Card moved event sent to project members only:', memberUserIds);

        // Slack 알림 전송 (비동기, 실패해도 카드 이동은 성공)
        if (project.slackEnabled && project.slackWebhookUrl) {
          const board = await boards.findByProjectId(projectId);
          const fromColumn = board?.columns.find(col => col.id === sourceColumnId);
          const toColumn = board?.columns.find(col => col.id === destinationColumnId);

          fetch(`${req.headers.origin || 'http://localhost:3000'}/api/slack/notify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': req.headers.cookie || '',
            },
            body: JSON.stringify({
              projectId,
              event: 'card_moved',
              cardTitle: updatedCard?.title || '알 수 없는 카드',
              cardId: cardId,
              fromColumn: fromColumn?.title,
              toColumn: toColumn?.title,
              userName: session.user.name || '알 수 없는 사용자',
            }),
          }).catch((err) => console.error('Failed to send Slack notification:', err));
        }
      } else {
        console.log('⚠️ [API] Project not found, skipping WebSocket event');
      }
    } else {
      console.log('❌ [API] No WebSocket server available');
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
