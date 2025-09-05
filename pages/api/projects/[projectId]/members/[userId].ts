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
  const { projectId, userId } = req.query;

  if (typeof projectId !== 'string' || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID or user ID' });
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const projects = getProjects();
    const projectIndex = projects.findIndex(p => p.projectId === projectId);

    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projects[projectIndex];

    // TODO: 권한 체크 (프로젝트 소유자만 멤버 제거 가능)

    // 프로젝트 소유자는 제거할 수 없음
    if (project.ownerId === userId) {
      return res.status(400).json({ error: 'Cannot remove project owner' });
    }

    // 멤버에서 제거
    const memberIndex = project.members.findIndex(member => member.id === userId);
    
    if (memberIndex === -1) {
      return res.status(404).json({ error: 'Member not found' });
    }

    project.members.splice(memberIndex, 1);
    project.updatedAt = new Date();

    projects[projectIndex] = project;
    saveProjects(projects);

    res.status(200).json({ project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
}
