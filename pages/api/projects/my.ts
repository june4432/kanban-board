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
    const { userId } = req.query;
    
    // userId가 없으면 빈 배열 반환
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'User ID is required', projects: [] });
    }
    
    const allProjects = getProjects();
    const allUsers = getUsers();
    
    // 사용자가 소유하거나 멤버인 프로젝트들 (원본 데이터로 필터링)
    const rawMyProjects = allProjects.filter(project => 
      project.ownerId === userId || 
      (project.members as any[]).some((member: any) => member.userId === userId)
    );

    // 멤버 정보를 User 객체로 변환
    const myProjects = populateProjectMembers(rawMyProjects, allUsers);

    console.log(`[DEBUG] User ${userId} has ${myProjects.length} projects`);
    res.status(200).json({ projects: myProjects });
  } catch (error) {
    console.error('Error fetching my projects:', error);
    res.status(500).json({ error: 'Failed to fetch my projects' });
  }
}
