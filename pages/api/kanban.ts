import { NextApiRequest, NextApiResponse } from 'next';
import { getRepositories } from '@/lib/repositories';
import { requireProjectMember } from '@/lib/auth-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET': {
        // 프로젝트별 보드 데이터 조회
        const { projectId } = req.query;

        console.log('🔍 API Request - projectId:', projectId);

        if (!projectId || typeof projectId !== 'string') {
          console.log('❌ No projectId provided in query');
          return res.status(400).json({ error: 'Project ID is required' });
        }

        // 인증 및 프로젝트 멤버십 확인
        const auth = await requireProjectMember(req, res, projectId);
        if (!auth) return; // 이미 에러 응답 전송됨

        console.log(`📚 Reading data for projectId: ${projectId}`);

        const { boards } = getRepositories();

        // 보드 조회 (없으면 자동 생성됨)
        const board = boards.findByProjectId(projectId);

        if (!board) {
          console.log(`⚠️ No board found for projectId ${projectId}, creating new empty board`);
          // This shouldn't happen as ProjectRepository creates a board automatically
          // but we handle it just in case
          return res.status(404).json({ error: 'Board not found' });
        }

        console.log('📤 Sending board data');
        res.status(200).json({ board });
        break;
      }

      case 'PUT': {
        // 전체 보드 데이터 업데이트
        // Note: In SQLite, we should update individual entities instead of the whole board
        // This is a legacy endpoint that we'll keep for compatibility but log a warning
        console.log('⚠️ PUT /api/kanban is deprecated. Use specific card/column endpoints instead.');

        const { board } = req.body;
        console.log('📝 PUT request - received board data');

        if (!board) {
          console.log('❌ No board data provided');
          return res.status(400).json({ error: 'Board data is required' });
        }

        if (!board.projectId) {
          console.log('❌ No projectId in board data');
          return res.status(400).json({ error: 'Board projectId is required' });
        }

        // For now, we'll just return success
        // Individual card/column operations should use their specific endpoints
        console.log('✅ Board update acknowledged (use specific endpoints for actual updates)');
        res.status(200).json({ success: true });
        break;
      }

      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
