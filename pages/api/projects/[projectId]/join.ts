import { NextApiRequest, NextApiResponse } from 'next';
import { getRepositories } from '@/lib/repositories';

// WebSocket server extension type
type NextApiResponseWithSocket = NextApiResponse & {
  socket?: {
    server?: {
      io: any;
    };
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  const { projectId } = req.query;

  if (typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, message } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const { projects, users } = getRepositories();

    const project = await projects.findById(projectId);
    const user = await users.findById(userId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 프로젝트가 공개인지 확인
    if (!project.isPublic) {
      return res.status(403).json({ error: 'This project is not public' });
    }

    // 이미 멤버인지 확인
    if (await projects.isMember(projectId, userId)) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    // 이미 대기 중인 신청이 있는지 확인
    const existingRequests = project.pendingRequests?.filter(
      (req) => req.userId === userId && req.status === 'pending'
    );
    if (existingRequests && existingRequests.length > 0) {
      return res.status(400).json({ error: 'Join request already exists' });
    }

    // 새 가입 신청 생성 (use email instead of userId for new schema)
    await projects.createJoinRequest({
      projectId,
      email: user.email,
      invitedBy: userId, // Self-invite for join requests
      message: message || '',
    });

    // Get the created request
    const updatedProject = await projects.findById(projectId);
    const newRequest = updatedProject?.pendingRequests?.[0];

    // WebSocket으로 프로젝트 참여 신청 이벤트 전송 (전체 브로드캐스트)
    const socketRes = res as NextApiResponseWithSocket;
    if (socketRes.socket?.server?.io) {
      socketRes.socket.server.io.emit('project-join-request', {
        projectId: projectId,
        request: newRequest,
        user: user,
        project: project,
      });
      console.log('Project join request event broadcasted to all users');
    }

    res.status(201).json({ request: newRequest });
  } catch (error) {
    console.error('Error creating join request:', error);
    res.status(500).json({ error: 'Failed to create join request' });
  }
}
