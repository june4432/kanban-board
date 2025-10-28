import { NextApiRequest, NextApiResponse } from 'next';
import { getRepositories } from '@/lib/repositories';
import { requireAuth, requireProjectMember, requireProjectOwner } from '@/lib/auth-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;

  if (typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  switch (req.method) {
    case 'GET':
      return handleGet(projectId, req, res);
    case 'PATCH':
      return handlePatch(projectId, req, res);
    case 'DELETE':
      return handleDelete(projectId, req, res);
    default:
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
      res.status(405).json({ error: 'Method not allowed' });
  }
}

// 특정 프로젝트 조회
async function handleGet(projectId: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    // 인증 확인 (공개 프로젝트는 인증 없이도 조회 가능하도록 변경 가능)
    const session = await requireAuth(req, res);
    if (!session) return;

    const { projects } = getRepositories();
    const project = projects.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // 비공개 프로젝트는 멤버만 조회 가능
    if (!project.isPublic) {
      const userId = (session.user as any).id;
      const isMember = project.ownerId === userId || project.members.some((m) => m.id === userId);

      if (!isMember) {
        return res.status(403).json({ error: 'Access denied to private project' });
      }
    }

    res.status(200).json({ project });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
}

// 프로젝트 업데이트
async function handlePatch(projectId: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    // 멤버십 확인
    const auth = await requireProjectMember(req, res, projectId);
    if (!auth) return;

    const { project, userId } = auth;
    const { name, description, color, isPublic } = req.body;

    // 권한 체크: 프로젝트 소유자인지 확인
    const isOwner = project.ownerId === userId;

    // 소유자만 변경할 수 있는 설정들
    const ownerOnlyFields = { name, color, isPublic };

    if (!isOwner) {
      // 멤버는 설명만 수정 가능
      for (const [key, value] of Object.entries(ownerOnlyFields)) {
        if (value !== undefined) {
          return res.status(403).json({ error: `Only project owner can modify ${key}` });
        }
      }
    }

    // 업데이트할 데이터 준비
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (color !== undefined) updates.color = color;
    if (isPublic !== undefined) updates.isPublic = isPublic;

    const { projects } = getRepositories();
    const updatedProject = projects.update(projectId, updates);

    res.status(200).json({ project: updatedProject });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
}

// 프로젝트 삭제
async function handleDelete(projectId: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    // 소유자 권한 확인
    const auth = await requireProjectOwner(req, res, projectId);
    if (!auth) return;

    const { projects } = getRepositories();
    const deleted = projects.delete(projectId);

    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete project' });
    }

    res.status(204).end();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
}
