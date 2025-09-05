import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { Project } from '@/types';

const PROJECTS_FILE_PATH = path.join(process.cwd(), 'data', 'projects.json');

// 프로젝트 데이터 읽기
const getProjects = (): Project[] => {
  try {
    const data = fs.readFileSync(PROJECTS_FILE_PATH, 'utf8');
    return JSON.parse(data).projects || [];
  } catch (error) {
    console.error('Error reading projects:', error);
    return [];
  }
};

// 프로젝트 데이터 저장
const saveProjects = (projects: Project[]): void => {
  const data = { projects };
  fs.writeFileSync(PROJECTS_FILE_PATH, JSON.stringify(data, null, 2));
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;

  if (typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const projects = getProjects();
    const projectIndex = projects.findIndex(p => p.projectId === projectId);

    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projects[projectIndex];

    // 프로젝트 소유자는 나갈 수 없음
    if (project.ownerId === userId) {
      return res.status(400).json({ 
        error: '프로젝트 소유자는 프로젝트를 나갈 수 없습니다. 프로젝트를 삭제하거나 소유권을 이전하세요.' 
      });
    }

    // 사용자가 실제로 프로젝트 멤버인지 확인
    const memberIndex = project.members.findIndex(member => member.userId === userId);
    if (memberIndex === -1) {
      return res.status(400).json({ error: '프로젝트 멤버가 아닙니다.' });
    }

    // 멤버에서 제거
    project.members.splice(memberIndex, 1);
    project.updatedAt = new Date().toISOString();

    // 변경사항 저장
    projects[projectIndex] = project;
    saveProjects(projects);

    res.status(200).json({ 
      success: true,
      message: '프로젝트에서 성공적으로 나가셨습니다.',
      project 
    });

  } catch (error) {
    console.error('Error leaving project:', error);
    res.status(500).json({ error: 'Failed to leave project' });
  }
}
