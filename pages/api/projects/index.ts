import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { Project, User, ProjectMember } from '@/types';

const projectsFilePath = path.join(process.cwd(), 'data', 'projects.json');
const usersFilePath = path.join(process.cwd(), 'data', 'users.json');

// 사용자 데이터 읽기
const getUsers = (): User[] => {
  try {
    const data = fs.readFileSync(usersFilePath, 'utf8');
    return JSON.parse(data).users || [];
  } catch (error) {
    return [];
  }
};

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
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: 'Method not allowed' });
  }
}

// 프로젝트 목록 조회
function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const projects = getProjects();
    res.status(200).json({ projects });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
}

// 새 프로젝트 생성
function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name, description, ownerId, color } = req.body;

    if (!name || !ownerId) {
      return res.status(400).json({ error: 'Name and ownerId are required' });
    }

    const projects = getProjects();
    const users = getUsers();
    
    // 프로젝트 생성자 정보 찾기
    const owner = users.find(user => user.id === ownerId);
    if (!owner) {
      return res.status(400).json({ error: 'Owner not found' });
    }

    const newProject: Project = {
      projectId: Date.now().toString(),
      name,
      description: description || '',
      ownerId,
      members: [owner], // 프로젝트 생성자를 자동으로 멤버로 추가
      createdAt: new Date(),
      updatedAt: new Date(),
      color: color || '#3b82f6',
      isPublic: req.body.isPublic || false,
      pendingRequests: []
    };

    projects.push(newProject);
    saveProjects(projects);

    res.status(201).json({ project: newProject });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
}