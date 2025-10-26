import { NextApiRequest, NextApiResponse } from 'next';
import { getRepositories } from '@/lib/repositories';

type NextApiResponseWithSocket = NextApiResponse & {
  socket?: {
    server?: {
      io: any;
    };
  };
};

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  const { projectId, requestId } = req.query;

  if (typeof projectId !== 'string' || typeof requestId !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID or request ID' });
  }

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "approve" or "reject"' });
    }

    const { projects, users } = getRepositories();
    const project = projects.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const request = project.pendingRequests?.find((req) => req.id === requestId);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // TODO: 권한 체크 (프로젝트 소유자만 승인/거부 가능)

    let success;

    if (action === 'approve') {
      // 가입 신청 승인
      success = projects.approveJoinRequest(requestId);
    } else {
      // 가입 신청 거부
      success = projects.rejectJoinRequest(requestId);
    }

    if (!success) {
      return res.status(500).json({ error: 'Failed to process join request' });
    }

    // Get updated project
    const updatedProject = projects.findById(projectId);
    if (!updatedProject) {
      return res.status(404).json({ error: 'Project not found after update' });
    }

    // 사용자 정보 가져오기 (WebSocket 이벤트용)
    const user = users.findById(request.userId);

    // WebSocket으로 승인/거부 결과 전송 (전체 브로드캐스트)
    if (res.socket?.server?.io) {
      res.socket.server.io.emit('project-join-response', {
        projectId: projectId,
        requestId: requestId,
        action: action,
        project: updatedProject,
        user: user,
        message:
          action === 'approve'
            ? `"${updatedProject.name}" 프로젝트 참여가 승인되었습니다!`
            : `"${updatedProject.name}" 프로젝트 참여가 거부되었습니다.`,
      });
      console.log(`Project join request ${action} event broadcasted to all users`);
    }

    res.status(200).json({ project: updatedProject });
  } catch (error) {
    console.error('Error handling join request:', error);
    res.status(500).json({ error: 'Failed to handle join request' });
  }
}
