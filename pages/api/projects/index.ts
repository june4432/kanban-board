import { NextApiRequest, NextApiResponse } from 'next';
import { getRepositories } from '@/lib/repositories';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
async function handleGet(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const { projects } = getRepositories();
    const allProjects = await projects.findAll();
    res.status(200).json({ projects: allProjects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
}

// 새 프로젝트 생성
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name, description, ownerId, color } = req.body;

    if (!name || !ownerId) {
      return res.status(400).json({ error: 'Name and ownerId are required' });
    }

    const { projects, users } = getRepositories();

    // 프로젝트 생성자 확인
    const owner = await users.findById(ownerId);
    if (!owner) {
      return res.status(400).json({ error: 'Owner not found' });
    }

    const newProject = await projects.create({
      name,
      description,
      ownerId,
      color: color || '#3b82f6',
      isPublic: req.body.isPublic || false,
    });

    res.status(201).json({ project: newProject });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
}
