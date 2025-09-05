import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { Project, ProjectJoinRequest, User } from '@/types';

type NextApiResponseWithSocket = NextApiResponse & {
  socket?: {
    server?: {
      io: any;
    };
  };
}

const projectsFilePath = path.join(process.cwd(), 'data', 'projects.json');
const usersFilePath = path.join(process.cwd(), 'data', 'users.json');

// 프로젝트 데이터 읽기
const getProjects = (): Project[] => {
  try {
    const data = fs.readFileSync(projectsFilePath, 'utf8');
    return JSON.parse(data).projects || [];
  } catch (error) {
    return [];
  }
};

// 사용자 데이터 읽기
const getUsers = (): User[] => {
  try {
    const data = fs.readFileSync(usersFilePath, 'utf8');
    return JSON.parse(data).users || [];
  } catch (error) {
    return [];
  }
};

// 프로젝트 데이터 저장
const saveProjects = (projects: Project[]) => {
  const data = { projects };
  fs.writeFileSync(projectsFilePath, JSON.stringify(data, null, 2));
};

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
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

    const projects = getProjects();
    const users = getUsers();
    
    const projectIndex = projects.findIndex(p => p.projectId === projectId);
    const user = users.find(u => u.id === userId);

    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const project = projects[projectIndex];

    // 프로젝트가 공개인지 확인
    if (!project.isPublic) {
      return res.status(403).json({ error: 'This project is not public' });
    }

    // 이미 멤버인지 확인
    if (project.members.some(member => member.id === userId)) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    // 이미 신청했는지 확인
    if (project.pendingRequests?.some(req => req.userId === userId && req.status === 'pending')) {
      return res.status(400).json({ error: 'Join request already exists' });
    }

    // 새 가입 신청 생성
    const newRequest: ProjectJoinRequest = {
      id: Date.now().toString(),
      userId,
      user,
      projectId,
      message: message || '',
      status: 'pending',
      createdAt: new Date()
    };

    // 프로젝트에 신청 추가
    if (!project.pendingRequests) {
      project.pendingRequests = [];
    }
    project.pendingRequests.push(newRequest);

    projects[projectIndex] = project;
    saveProjects(projects);

    // WebSocket으로 프로젝트 참여 신청 이벤트 전송 (전체 브로드캐스트)
    if (res.socket?.server?.io) {
      res.socket.server.io.emit('project-join-request', {
        projectId: projectId,
        request: newRequest,
        user: user,
        project: project
      });
      console.log('Project join request event broadcasted to all users');
    }

    res.status(201).json({ request: newRequest });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create join request' });
  }
}
