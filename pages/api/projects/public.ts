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

// 프로젝트 멤버를 User 객체로 변환
const populateProjectMembers = (projects: any[], users: User[]): Project[] => {
  return projects.map(project => ({
    ...project,
    members: project.members
      .map((member: ProjectMember) => users.find(user => user.id === member.userId))
      .filter(Boolean) as User[]
  }));
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const allProjects = getProjects();
    const allUsers = getUsers();
    
    // 공개 프로젝트만 필터링
    const rawPublicProjects = allProjects.filter(project => project.isPublic);

    // 멤버 정보를 User 객체로 변환
    const publicProjects = populateProjectMembers(rawPublicProjects, allUsers);

    res.status(200).json({ projects: publicProjects });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch public projects' });
  }
}
