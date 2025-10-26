import { NextApiRequest, NextApiResponse } from 'next';
import { getRepositories } from '@/lib/repositories';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projects } = getRepositories();

    // 공개 프로젝트만 조회
    const publicProjects = projects.findPublicProjects();

    res.status(200).json({ projects: publicProjects });
  } catch (error) {
    console.error('Error fetching public projects:', error);
    res.status(500).json({ error: 'Failed to fetch public projects' });
  }
}
