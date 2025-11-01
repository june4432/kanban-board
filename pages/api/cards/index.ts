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
  try {
    const { columnId, cardData } = req.body;

    if (!columnId || !cardData) {
      return res.status(400).json({ error: 'Column ID and card data are required' });
    }

    // projectId를 cardData에서 가져오거나 query에서 가져옴
    const projectId = cardData.projectId || (req.query.projectId as string);

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // 인증 및 프로젝트 멤버십 확인
    const auth = await requireProjectMember(req, res, projectId);
    if (!auth) return; // 이미 에러 응답 전송됨

    const { session } = auth;

    const { cards, boards, projects } = getRepositories();

    switch (req.method) {
      case 'POST':
        // 새 카드 생성

        // 보드 조회
        const board = boards.findByProjectId(projectId);
        if (!board) {
          return res.status(404).json({ error: 'Board not found' });
        }

        const column = board.columns.find((col) => col.id === columnId);
        if (!column) {
          return res.status(404).json({ error: 'Column not found' });
        }

        // WIP 제한 체크
        if (column.wipLimit > 0 && column.cards.length >= column.wipLimit) {
          return res.status(400).json({
            error: `WIP 제한 초과: ${column.title} 컬럼의 최대 카드 수는 ${column.wipLimit}개입니다.`,
          });
        }

        // 카드 생성
        const newCard = cards.create({
          columnId,
          title: cardData.title || '',
          description: cardData.description || '',
          assignees: cardData.assignees || [],
          labels: (cardData.labels || []).map((l: any) => l.id),
          milestoneId: cardData.milestone?.id,
          priority: cardData.priority || 'medium',
          dueDate: cardData.dueDate ? new Date(cardData.dueDate) : undefined,
        });

        // 웹소켓 이벤트 전송 (프로젝트 멤버들에게만)
        const socketRes = res as NextApiResponseWithSocket;
        if (socketRes.socket?.server?.io && projectId) {
          const project = projects.findById(projectId);
          if (project) {
            const eventData = {
              card: newCard,
              user: { id: session.user.id, name: session.user.name || '알 수 없는 사용자' },
              projectId: projectId,
              timestamp: Date.now(),
            };

            // 프로젝트 멤버들의 사용자 ID 목록 수집
            const memberUserIds = [
              project.ownerId, // 프로젝트 소유자
              ...project.members.map((member) => member.id), // 멤버들
            ];

            // 프로젝트 멤버들에게만 이벤트 전송
            memberUserIds.forEach((memberId) => {
              socketRes.socket!.server!.io.to(`user-${memberId}`).emit('card-created', eventData);
            });

            console.log('Card created event sent to project members:', memberUserIds);
          }
        }

        res.status(201).json({ card: newCard });
        break;

      default:
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
