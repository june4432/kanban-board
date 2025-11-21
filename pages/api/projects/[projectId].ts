import { NextApiRequest, NextApiResponse } from 'next';
import { getRepositories } from '@/lib/repositories';
import { requireProjectMember, requireProjectOwner } from '@/lib/auth-helpers';

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
async function handleGet(projectId: string, _req: NextApiRequest, res: NextApiResponse) {
  try {
    const { projects } = getRepositories();
    const project = await projects.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
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
    // 인증 및 프로젝트 멤버십 확인
    const auth = await requireProjectMember(req, res, projectId);
    if (!auth) return; // 이미 에러 응답 전송됨

    const { session: _session, isOwner } = auth;

    const { name, description, color, isPublic, slackWebhookUrl, slackEnabled } = req.body;

    // 소유자만 변경할 수 있는 설정들
    const ownerOnlyFields = { name, color, isPublic };

    if (!isOwner) {
      // 멤버는 설명 및 통합 설정만 수정 가능
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
    if (slackWebhookUrl !== undefined) updates.slackWebhookUrl = slackWebhookUrl;
    if (slackEnabled !== undefined) updates.slackEnabled = slackEnabled;

    const { projects } = getRepositories();
    const updatedProject = await projects.update(projectId, updates);

    res.status(200).json({ project: updatedProject });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
}

// 프로젝트 삭제
async function handleDelete(projectId: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    // 인증 및 소유자 권한 확인
    const session = await requireProjectOwner(req, res, projectId);
    if (!session) return; // 이미 에러 응답 전송됨

    const { projects } = getRepositories();
    const deleted = await projects.delete(projectId);

    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete project' });
    }

    res.status(204).end();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
}
