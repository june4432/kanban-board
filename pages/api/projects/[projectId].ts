import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { Project } from '@/types';

const projectsFilePath = path.join(process.cwd(), 'data', 'projects.json');

// 프로젝트 데이터 읽기
const getProjects = (): Project[] => {
  try {
    const data = fs.readFileSync(projectsFilePath, 'utf8');
    return JSON.parse(data).projects || [];
  } catch (error) {
    return [];
  }
};

// 프로젝트 데이터 저장
const saveProjects = (projects: Project[]) => {
  const data = { projects };
  fs.writeFileSync(projectsFilePath, JSON.stringify(data, null, 2));
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
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
function handleGet(projectId: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const projects = getProjects();
    const project = projects.find(p => p.projectId === projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.status(200).json({ project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
}

// 프로젝트 업데이트
function handlePatch(projectId: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const projects = getProjects();
    const projectIndex = projects.findIndex(p => p.projectId === projectId);

    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { name, description, color, isPublic, userId } = req.body;
    const project = projects[projectIndex];

    // 권한 체크: 프로젝트 소유자이거나 멤버인지 확인
    const isOwner = project.ownerId === userId;
    const isMember = project.members?.some(member => member.id === userId);
    
    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 소유자만 변경할 수 있는 설정들
    const ownerOnlyFields = { name, color, isPublic };
    const memberFields = { description };

    if (!isOwner) {
      // 멤버는 설명만 수정 가능
      for (const [key, value] of Object.entries(ownerOnlyFields)) {
        if (value !== undefined) {
          return res.status(403).json({ error: `Only project owner can modify ${key}` });
        }
      }
    }

    // 업데이트
    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (color !== undefined) project.color = color;
    if (isPublic !== undefined) project.isPublic = isPublic;
    project.updatedAt = new Date();

    projects[projectIndex] = project;
    saveProjects(projects);

    res.status(200).json({ project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
}

// 프로젝트 삭제
function handleDelete(projectId: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const projects = getProjects();
    const projectIndex = projects.findIndex(p => p.projectId === projectId);

    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // TODO: 권한 체크 (프로젝트 소유자만 삭제 가능)

    projects.splice(projectIndex, 1);
    saveProjects(projects);

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
}
