import { NextApiRequest, NextApiResponse } from 'next';
import { getRepositories } from '@/lib/repositories';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectId, userId } = req.query;

  if (typeof projectId !== 'string' || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID or user ID' });
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projects } = getRepositories();
    const project = projects.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // TODO: 권한 체크 (프로젝트 소유자만 멤버 제거 가능)

    // 프로젝트 소유자는 제거할 수 없음
    if (project.ownerId === userId) {
      return res.status(400).json({ error: 'Cannot remove project owner' });
    }

    // 멤버인지 확인
    if (!projects.isMember(projectId, userId)) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // 멤버에서 제거
    const removed = projects.removeMember(projectId, userId);

    if (!removed) {
      return res.status(500).json({ error: 'Failed to remove member' });
    }

    // 업데이트된 프로젝트 반환
    const updatedProject = projects.findById(projectId);

    res.status(200).json({ project: updatedProject });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
}
