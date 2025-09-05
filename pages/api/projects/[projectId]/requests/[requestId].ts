import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { Project, ProjectMember } from '@/types';

type NextApiResponseWithSocket = NextApiResponse & {
  socket?: {
    server?: {
      io: any;
    };
  };
}

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

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  const { projectId, requestId } = req.query;

  if (typeof projectId !== 'string' || typeof requestId !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID or request ID' });
  }

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "approve" or "reject"' });
    }

    const projects = getProjects();
    const projectIndex = projects.findIndex(p => p.projectId === projectId);

    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projects[projectIndex];
    const requestIndex = project.pendingRequests?.findIndex(req => req.id === requestId) ?? -1;

    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = project.pendingRequests![requestIndex];

    // TODO: 권한 체크 (프로젝트 소유자만 승인/거부 가능)

    if (action === 'approve') {
      // 멤버로 추가 (사용자 정보 전체)
      project.members.push(request.user);
      request.status = 'approved';
    } else {
      request.status = 'rejected';
    }

    // 대기 목록에서 제거 (승인/거부된 요청은 제거)
    project.pendingRequests!.splice(requestIndex, 1);

    project.updatedAt = new Date();
    projects[projectIndex] = project;
    saveProjects(projects);

    // WebSocket으로 승인/거부 결과 전송 (전체 브로드캐스트)
    if (res.socket?.server?.io) {
      res.socket.server.io.emit('project-join-response', {
        projectId: projectId,
        requestId: requestId,
        action: action,
        project: project,
        user: request.user,
        message: action === 'approve' 
          ? `"${project.name}" 프로젝트 참여가 승인되었습니다!` 
          : `"${project.name}" 프로젝트 참여가 거부되었습니다.`
      });
      console.log(`Project join request ${action} event broadcasted to all users`);
    }

    res.status(200).json({ project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to handle join request' });
  }
}
