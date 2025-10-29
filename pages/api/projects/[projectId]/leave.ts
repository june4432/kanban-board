import { NextApiRequest, NextApiResponse } from 'next';
import { getRepositories } from '@/lib/repositories';
import { requireProjectMember } from '@/lib/auth-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;

  if (typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 인증 및 멤버십 확인
    const auth = await requireProjectMember(req, res, projectId);
    if (!auth) return;

    const { project, userId } = auth;

    // 프로젝트 소유자는 나갈 수 없음
    if (project.ownerId === userId) {
      return res.status(400).json({
        error: '프로젝트 소유자는 프로젝트를 나갈 수 없습니다. 프로젝트를 삭제하거나 소유권을 이전하세요.',
      });
    }

    const { projects } = getRepositories();

    // 멤버에서 제거
    const removed = projects.removeMember(projectId, userId);

    if (!removed) {
      return res.status(500).json({ error: 'Failed to leave project' });
    }

    // 업데이트된 프로젝트 반환
    const updatedProject = projects.findById(projectId);

    res.status(200).json({
      success: true,
      message: '프로젝트에서 성공적으로 나가셨습니다.',
      project: updatedProject,
    });
  } catch (error) {
    console.error('Error leaving project:', error);
    res.status(500).json({ error: 'Failed to leave project' });
  }
}
